-- ===========================================================================
-- Migration: 20260817_013_direct_phone_sale.sql
-- Description: Supports Direct Phone Sales (selling without pre-existing phone_unit)
--              with strict IMEI collision guards, optional internal cost price
--              tracking (NULL when unrecorded), and updated reporting views.
-- ===========================================================================

-- 1. Allow cost_price_pence to be NULL when cost is unknown / not recorded
ALTER TABLE public.sale_items
  ALTER COLUMN cost_price_pence DROP NOT NULL;

-- 2. Lookup Index for Direct Sale IMEIs
-- Accelerates duplicate checks and warranty lookups without preventing future returns/resales
CREATE INDEX IF NOT EXISTS idx_sale_items_direct_sale_imei1
  ON public.sale_items ((device_snapshot->>'imei1'))
  WHERE (device_snapshot->>'imei1') IS NOT NULL;

-- 3. Drop all previous variations of sell_phone to resolve overload ambiguity (ERROR 42725)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT proname, oid::regprocedure AS func_signature
    FROM pg_proc
    WHERE proname = 'sell_phone' AND pronamespace = 'public'::regnamespace
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
  END LOOP;
END $$;

-- 4. Enhanced sell_phone RPC supporting both 'from_stock' and 'direct_sale'
CREATE OR REPLACE FUNCTION public.sell_phone(
  p_idempotency_key         text,
  p_phone_unit_id           uuid DEFAULT NULL,
  p_buyer_customer_id       uuid DEFAULT NULL,
  p_shift_id                uuid DEFAULT NULL,
  p_selling_price_pence     bigint DEFAULT 0,
  p_payment_method          text DEFAULT 'cash',
  p_amount_tendered_pence   bigint DEFAULT NULL,

  -- Warranty snapshot
  p_warranty_days           integer DEFAULT NULL,
  p_warranty_policy_text    text DEFAULT NULL,

  p_notes                   text DEFAULT NULL,

  -- Direct sale device fields (used when p_phone_unit_id IS NULL)
  p_brand                   text DEFAULT NULL,
  p_model                   text DEFAULT NULL,
  p_storage                 text DEFAULT NULL,
  p_colour                  text DEFAULT NULL,
  p_imei1                   text DEFAULT NULL,
  p_imei2                   text DEFAULT NULL,
  p_serial_number           text DEFAULT NULL,
  p_condition_grade         text DEFAULT 'Good',
  p_condition_notes         text DEFAULT NULL,
  p_battery_health          text DEFAULT NULL,
  p_network_status          text DEFAULT NULL,
  p_activation_lock_status  text DEFAULT NULL,
  p_accessories             text DEFAULT NULL,
  p_cost_price_pence        bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id         uuid := auth.uid();
  v_sale_id           uuid;
  v_inv_number        text;
  v_sale_item_id      uuid;
  v_unit              record;
  v_change            bigint;
  v_warranty_start    date;
  v_warranty_until    date;
  v_pay_method_enum   public.payment_method_type;
  v_product_name      text;
  v_cost_price_pence  bigint;
  v_device_snapshot   jsonb;
  v_imei1_norm        text;
  v_imei2_norm        text;
  v_conflicting_inv   text;
BEGIN
  -- Auth: admin or staff only
  IF v_caller_id IS NULL OR NOT (public.has_role(v_caller_id, 'admin') OR public.has_role(v_caller_id, 'staff')) THEN
    RAISE EXCEPTION 'Permission denied: admin or staff role required';
  END IF;

  -- Idempotency: return existing if already processed
  SELECT id INTO v_sale_id FROM public.sales WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    SELECT invoice_number INTO v_inv_number FROM public.sales WHERE id = v_sale_id;
    RETURN jsonb_build_object(
      'sale_id',        v_sale_id,
      'invoice_number', v_inv_number,
      'duplicate',      true
    );
  END IF;

  -- Selling price must be strictly positive
  IF p_selling_price_pence <= 0 THEN
    RAISE EXCEPTION 'Selling price must be greater than £0.00';
  END IF;

  -- Restrict payment method
  IF p_payment_method NOT IN ('cash', 'card', 'bank_transfer') THEN
    RAISE EXCEPTION 'Invalid payment method for phone sale: %. Only cash, card, or bank_transfer are supported.', p_payment_method;
  END IF;
  v_pay_method_enum := p_payment_method::public.payment_method_type;

  -- Cash payment validation: open shift is mandatory
  IF p_payment_method = 'cash' THEN
    IF p_shift_id IS NULL THEN
      RAISE EXCEPTION 'Open shift ID is required for cash sales';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.shifts WHERE id = p_shift_id AND status = 'open') THEN
      RAISE EXCEPTION 'Specified shift is not open';
    END IF;
  END IF;

  -- Validate cost price (cannot be negative)
  IF p_cost_price_pence IS NOT NULL THEN
    IF p_cost_price_pence < 0 THEN
      RAISE EXCEPTION 'Cost price cannot be negative';
    END IF;
    v_cost_price_pence := p_cost_price_pence;
  ELSE
    v_cost_price_pence := NULL;
  END IF;

  -- MODE 1: SELL FROM STOCK (p_phone_unit_id IS NOT NULL)
  IF p_phone_unit_id IS NOT NULL THEN
    SELECT * INTO v_unit
    FROM public.phone_units
    WHERE id = p_phone_unit_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Phone unit not found';
    END IF;
    IF v_unit.status <> 'in_stock' THEN
      RAISE EXCEPTION 'This phone has already been sold or is not available for sale (status: %)', v_unit.status;
    END IF;

    v_product_name := v_unit.brand || ' ' || v_unit.model
      || COALESCE(' ' || v_unit.storage, '')
      || COALESCE(' (' || v_unit.colour || ')', '');
    v_cost_price_pence := v_unit.purchase_cost_pence;

    v_device_snapshot := jsonb_build_object(
      'brand',                  v_unit.brand,
      'model',                  v_unit.model,
      'storage',                v_unit.storage,
      'colour',                 v_unit.colour,
      'imei1',                  v_unit.imei1,
      'imei2',                  v_unit.imei2,
      'serial_number',          v_unit.serial_number,
      'condition_grade',        v_unit.condition_grade,
      'condition_notes',        v_unit.condition_notes,
      'battery_health',         v_unit.battery_health,
      'network_status',         v_unit.network_status,
      'activation_lock_status', v_unit.activation_lock_status,
      'accessories',            v_unit.accessories,
      'stock_number',           v_unit.stock_number
    );

  -- MODE 2: DIRECT PHONE SALE (p_phone_unit_id IS NULL)
  ELSE
    IF p_brand IS NULL OR trim(p_brand) = '' THEN
      RAISE EXCEPTION 'Device Brand is required for direct sale';
    END IF;
    IF p_model IS NULL OR trim(p_model) = '' THEN
      RAISE EXCEPTION 'Device Model is required for direct sale';
    END IF;
    IF p_imei1 IS NULL OR trim(p_imei1) = '' THEN
      RAISE EXCEPTION 'IMEI 1 is required for direct sale';
    END IF;

    -- Normalise IMEIs (uppercase, remove spaces and dashes)
    v_imei1_norm := regexp_replace(upper(trim(p_imei1)), '[\s\-]+', '', 'g');
    IF length(v_imei1_norm) < 8 THEN
      RAISE EXCEPTION 'IMEI 1 must contain at least 8 characters';
    END IF;

    IF p_imei2 IS NOT NULL AND trim(p_imei2) <> '' THEN
      v_imei2_norm := regexp_replace(upper(trim(p_imei2)), '[\s\-]+', '', 'g');
      IF v_imei1_norm = v_imei2_norm THEN
        RAISE EXCEPTION 'IMEI 1 and IMEI 2 cannot be identical';
      END IF;
    ELSE
      v_imei2_norm := NULL;
    END IF;

    -- 1. Collision check: IMEI exists in active inventory (in_stock)
    IF EXISTS (
      SELECT 1 FROM public.phone_units
      WHERE status = 'in_stock'
        AND (
          imei1 = v_imei1_norm
          OR (imei2 IS NOT NULL AND imei2 = v_imei1_norm)
          OR (v_imei2_norm IS NOT NULL AND (imei1 = v_imei2_norm OR (imei2 IS NOT NULL AND imei2 = v_imei2_norm)))
        )
    ) THEN
      RAISE EXCEPTION 'This IMEI already exists in stock. Please use Sell From Stock.';
    END IF;

    -- 2. Duplicate check: IMEI was already sold in a previous active/completed sale
    SELECT s.invoice_number INTO v_conflicting_inv
    FROM public.sale_items si
    JOIN public.sales s ON s.id = si.sale_id
    WHERE s.status NOT IN ('voided', 'refunded')
      AND (
        si.device_snapshot->>'imei1' = v_imei1_norm
        OR si.device_snapshot->>'imei2' = v_imei1_norm
        OR (v_imei2_norm IS NOT NULL AND (
          si.device_snapshot->>'imei1' = v_imei2_norm
          OR si.device_snapshot->>'imei2' = v_imei2_norm
        ))
      )
    LIMIT 1;

    IF v_conflicting_inv IS NOT NULL THEN
      RAISE EXCEPTION 'This IMEI has already been sold in a previous sale (Invoice #%).', v_conflicting_inv;
    END IF;

    v_product_name := trim(p_brand) || ' ' || trim(p_model)
      || COALESCE(' ' || NULLIF(trim(p_storage), ''), '')
      || COALESCE(' (' || NULLIF(trim(p_colour), '') || ')', '');

    v_device_snapshot := jsonb_build_object(
      'brand',                  trim(p_brand),
      'model',                  trim(p_model),
      'storage',                NULLIF(trim(p_storage), ''),
      'colour',                 NULLIF(trim(p_colour), ''),
      'imei1',                  v_imei1_norm,
      'imei2',                  v_imei2_norm,
      'serial_number',          NULLIF(trim(p_serial_number), ''),
      'condition_grade',        COALESCE(p_condition_grade, 'Good'),
      'condition_notes',        NULLIF(trim(p_condition_notes), ''),
      'battery_health',         NULLIF(trim(p_battery_health), ''),
      'network_status',         NULLIF(trim(p_network_status), ''),
      'activation_lock_status', NULLIF(trim(p_activation_lock_status), ''),
      'accessories',            NULLIF(trim(p_accessories), ''),
      'direct_sale',            true
    );
  END IF;

  -- Compute warranty dates
  IF p_warranty_days IS NOT NULL AND p_warranty_days > 0 THEN
    v_warranty_start := CURRENT_DATE;
    v_warranty_until := CURRENT_DATE + (p_warranty_days || ' days')::interval;
  END IF;

  -- Compute change for cash tender
  IF p_amount_tendered_pence IS NOT NULL THEN
    IF p_payment_method = 'cash' AND p_amount_tendered_pence < p_selling_price_pence THEN
      RAISE EXCEPTION 'Amount tendered (% p) is less than selling price (% p)',
        p_amount_tendered_pence, p_selling_price_pence;
    END IF;
    v_change := GREATEST(p_amount_tendered_pence - p_selling_price_pence, 0);
  END IF;

  -- Generate invoice number
  v_inv_number := public.next_doc_number('INV');

  -- Create sale header
  INSERT INTO public.sales (
    invoice_number, idempotency_key, customer_id, shift_id,
    subtotal_pence, discount_pence, total_pence,
    amount_tendered_pence, change_pence,
    status, notes, created_by
  ) VALUES (
    v_inv_number, p_idempotency_key,
    p_buyer_customer_id, p_shift_id,
    p_selling_price_pence, 0, p_selling_price_pence,
    p_amount_tendered_pence, v_change,
    'completed',
    p_notes,
    v_caller_id
  )
  RETURNING id INTO v_sale_id;

  -- Create sale_item
  INSERT INTO public.sale_items (
    sale_id, product_id, phone_unit_id,
    product_name, quantity,
    unit_price_pence, discount_pence, line_total_pence,
    cost_price_pence,
    warranty_days, warranty_policy_text,
    warranty_start_date, warranty_until,
    device_snapshot
  ) VALUES (
    v_sale_id,
    NULL,
    p_phone_unit_id,
    v_product_name,
    1,
    p_selling_price_pence, 0, p_selling_price_pence,
    v_cost_price_pence,
    p_warranty_days, p_warranty_policy_text,
    v_warranty_start, v_warranty_until,
    v_device_snapshot
  )
  RETURNING id INTO v_sale_item_id;

  -- Create payment record
  INSERT INTO public.payments (
    idempotency_key, method, amount_pence,
    ref_type, ref_id, shift_id, created_by
  ) VALUES (
    p_idempotency_key || ':pay',
    v_pay_method_enum,
    p_selling_price_pence,
    'sale', v_sale_id,
    p_shift_id,
    v_caller_id
  );

  -- If sold from stock, mark unit as sold
  IF p_phone_unit_id IS NOT NULL THEN
    UPDATE public.phone_units
    SET status   = 'sold',
        sold_at  = now()
    WHERE id = p_phone_unit_id;
  END IF;

  RETURN jsonb_build_object(
    'sale_id',        v_sale_id,
    'invoice_number', v_inv_number,
    'sale_item_id',   v_sale_item_id,
    'total_pence',    p_selling_price_pence,
    'change_pence',   v_change,
    'warranty_until', v_warranty_until,
    'duplicate',      false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sell_phone TO authenticated;

-- 4. Update v_cogs_by_period to transparently handle NULL costs and pending margins
DROP VIEW IF EXISTS public.v_cogs_by_period CASCADE;

CREATE VIEW public.v_cogs_by_period
WITH (security_invoker = true)
AS
SELECT
  (s.created_at AT TIME ZONE 'Europe/London')::date AS trade_date,
  COALESCE(SUM(si.quantity * si.cost_price_pence), 0)::bigint AS cogs_pence,
  COALESCE(SUM(si.line_total_pence), 0)::bigint              AS revenue_pence,
  (COALESCE(SUM(si.line_total_pence), 0) - COALESCE(SUM(si.quantity * si.cost_price_pence), 0))::bigint AS gross_profit_pence,
  COUNT(*) FILTER (WHERE si.cost_price_pence IS NULL)::bigint AS unknown_cost_items_count,
  COALESCE(SUM(si.line_total_pence) FILTER (WHERE si.cost_price_pence IS NULL), 0)::bigint AS unknown_cost_revenue_pence,
  (COUNT(*) FILTER (WHERE si.cost_price_pence IS NULL) > 0) AS is_margin_pending
FROM public.sale_items si
JOIN public.sales s ON s.id = si.sale_id
WHERE s.status NOT IN ('voided')
GROUP BY trade_date
ORDER BY trade_date DESC;

GRANT SELECT ON public.v_cogs_by_period TO authenticated;

-- 5. Update v_phone_units_summary to include Direct Phone Sales in metrics
DROP VIEW IF EXISTS public.v_phone_units_summary CASCADE;

CREATE VIEW public.v_phone_units_summary
WITH (security_invoker = true)
AS
WITH stock_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE pu.status = 'in_stock')               AS units_in_stock,
    COUNT(*) FILTER (WHERE pu.status = 'sold')                   AS stock_units_sold,
    COUNT(*)                                                     AS stock_units_total,
    COALESCE(SUM(pu.purchase_cost_pence) FILTER (WHERE pu.status = 'in_stock'), 0)
                                                                 AS stock_cost_value_pence,
    COALESCE(SUM(pu.purchase_cost_pence), 0)                     AS total_purchased_pence
  FROM public.phone_units pu
),
all_phone_sales AS (
  SELECT
    si.id,
    si.phone_unit_id,
    si.line_total_pence,
    si.cost_price_pence,
    (si.phone_unit_id IS NULL AND (si.device_snapshot->>'direct_sale')::boolean = true) AS is_direct
  FROM public.sale_items si
  JOIN public.sales s ON s.id = si.sale_id
  WHERE s.status NOT IN ('voided')
    AND (si.phone_unit_id IS NOT NULL OR (si.device_snapshot->>'direct_sale')::boolean = true)
)
SELECT
  ss.units_in_stock,
  (ss.stock_units_sold + COALESCE(COUNT(*) FILTER (WHERE aps.is_direct), 0))::bigint AS units_sold,
  (ss.units_in_stock + ss.stock_units_sold + COALESCE(COUNT(*) FILTER (WHERE aps.is_direct), 0))::bigint AS units_total,
  ss.stock_cost_value_pence,
  ss.total_purchased_pence,
  COALESCE(SUM(aps.line_total_pence), 0)::bigint                AS sold_revenue_pence,
  COALESCE(SUM(aps.cost_price_pence), 0)::bigint                AS sold_cogs_pence,
  (COALESCE(SUM(aps.line_total_pence), 0) - COALESCE(SUM(aps.cost_price_pence), 0))::bigint AS gross_margin_pence,
  COALESCE(COUNT(*) FILTER (WHERE aps.is_direct), 0)::bigint    AS direct_sales_count,
  COALESCE(SUM(aps.line_total_pence) FILTER (WHERE aps.is_direct), 0)::bigint AS direct_sales_revenue_pence,
  COALESCE(COUNT(*) FILTER (WHERE aps.is_direct AND aps.cost_price_pence IS NULL), 0)::bigint AS direct_sales_unknown_cost_count,
  COALESCE(SUM(aps.line_total_pence) FILTER (WHERE aps.is_direct AND aps.cost_price_pence IS NULL), 0)::bigint AS direct_sales_unknown_cost_revenue_pence,
  (COALESCE(COUNT(*) FILTER (WHERE aps.cost_price_pence IS NULL), 0) > 0) AS is_margin_pending
FROM stock_stats ss
LEFT JOIN all_phone_sales aps ON true
GROUP BY
  ss.units_in_stock,
  ss.stock_units_sold,
  ss.stock_units_total,
  ss.stock_cost_value_pence,
  ss.total_purchased_pence;

GRANT SELECT ON public.v_phone_units_summary TO authenticated;
