-- =============================================================================
-- MIGRATION 20260813_012: Phone Buy & Sell Module
-- Pre-owned mobile phone buy-in from customers and resale tracking.
-- Extends existing Sales, Customers, Till/Shifts, and Reporting architecture.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extend doc_type enum with 'PHN' for Phone Purchase Voucher numbers
-- ---------------------------------------------------------------------------
ALTER TYPE public.doc_type ADD VALUE IF NOT EXISTS 'PHN';

-- ---------------------------------------------------------------------------
-- 1. Extend cash_movements.type CHECK to include 'phone_buy_out'
--    Sign convention (matches existing pattern):
--      amount_pence is stored POSITIVE (e.g. 35000 for £350)
--      Type 'phone_buy_out' means cash left the till.
--      close_shift will SUBTRACT SUM(phone_buy_out) from expected_cash.
-- ---------------------------------------------------------------------------
ALTER TABLE public.cash_movements
  DROP CONSTRAINT IF EXISTS cash_movements_type_check;

ALTER TABLE public.cash_movements
  ADD CONSTRAINT cash_movements_type_check
  CHECK (type IN ('float_in','float_out','expense','sale','refund','repair_payment','phone_buy_out'));

-- ---------------------------------------------------------------------------
-- 2. phone_units — one row = one physical handset (in_stock or sold)
--    SECURITY RULE: SELECT ONLY for authenticated staff.
--    INSERT/UPDATE/DELETE strictly forbidden directly — writes are RPC-ONLY.
-- ---------------------------------------------------------------------------
CREATE TABLE public.phone_units (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stock identity
  stock_number            text UNIQUE NOT NULL,           -- PHN-2026-000001

  -- Device details
  brand                   text NOT NULL,
  model                   text NOT NULL,
  storage                 text,                           -- '128GB', '256GB', etc.
  colour                  text,
  imei1                   text NOT NULL,                  -- normalised, no spaces/dashes
  imei2                   text,                           -- normalised, nullable (dual-SIM)
  serial_number           text,

  -- Condition at acquisition
  condition_grade         text NOT NULL DEFAULT 'Good'
                            CHECK (condition_grade IN ('Excellent','Good','Fair','Faulty')),
  condition_notes         text,
  battery_health          text,                           -- e.g. '85%' — free text
  network_status          text,                           -- 'Unlocked','O2 locked', etc.
  activation_lock_status  text,                           -- 'Clean','iCloud locked', etc.
  accessories             text,                           -- free text list

  -- Financials (pence)
  purchase_cost_pence     bigint NOT NULL DEFAULT 0 CHECK (purchase_cost_pence >= 0),

  -- Lifecycle
  status                  text NOT NULL DEFAULT 'in_stock'
                            CHECK (status IN ('in_stock','sold')),
  purchased_at            timestamptz NOT NULL DEFAULT now(),
  sold_at                 timestamptz,

  -- Audit
  created_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_units ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.phone_units TO authenticated;
GRANT ALL ON public.phone_units TO service_role;

CREATE TRIGGER phone_units_updated_at
  BEFORE UPDATE ON public.phone_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- IMEI1: globally unique across all active phone_units
CREATE UNIQUE INDEX idx_phone_units_imei1
  ON public.phone_units(imei1)
  WHERE imei1 IS NOT NULL AND imei1 <> '';

-- IMEI2: unique among non-null entries
CREATE UNIQUE INDEX idx_phone_units_imei2
  ON public.phone_units(imei2)
  WHERE imei2 IS NOT NULL AND imei2 <> '';

CREATE INDEX idx_phone_units_status      ON public.phone_units(status);
CREATE INDEX idx_phone_units_created     ON public.phone_units(created_at DESC);
CREATE INDEX idx_phone_units_stock_num   ON public.phone_units(stock_number);

-- RLS policies: SELECT ONLY for authenticated staff (RPCs run with SECURITY DEFINER to bypass RLS for inserts/updates)
CREATE POLICY "phone_units_staff_read"
  ON public.phone_units FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ---------------------------------------------------------------------------
-- 3. phone_purchase_transactions — buy-in record per handset
--    SECURITY RULE: SELECT ONLY for authenticated staff. Writes RPC-ONLY.
-- ---------------------------------------------------------------------------
CREATE TABLE public.phone_purchase_transactions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number           text UNIQUE NOT NULL,          -- PHN-2026-000001
  idempotency_key           text UNIQUE NOT NULL,          -- duplicate-submit guard
  phone_unit_id             uuid NOT NULL REFERENCES public.phone_units(id) ON DELETE RESTRICT,
  seller_customer_id        uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,

  -- Price & payment
  purchase_price_pence      bigint NOT NULL CHECK (purchase_price_pence >= 0),
  payment_method            text NOT NULL DEFAULT 'cash'
                              CHECK (payment_method IN ('cash','bank_transfer','other')),
  bank_reference            text,                          -- optional ref for bank transfers

  -- Shift linkage (cash payments only)
  shift_id                  uuid REFERENCES public.shifts(id) ON DELETE SET NULL,

  -- Seller declaration snapshot (immutable after creation)
  seller_declaration_text   text NOT NULL,
  seller_confirmed_at       timestamptz NOT NULL,

  -- Optional store-policy ID check (minimal, JSONB, not printed on receipts)
  seller_id_check           jsonb,                         -- {type: 'Driving Licence', reference: 'DL****1234'}
  seller_age_confirmed      boolean NOT NULL DEFAULT false CHECK (seller_age_confirmed = true),

  -- Condition snapshot at purchase (denormalised for receipt reprint)
  condition_snapshot        jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Staff
  staff_id                  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_purchase_transactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.phone_purchase_transactions TO authenticated;
GRANT ALL ON public.phone_purchase_transactions TO service_role;

CREATE INDEX idx_ppt_phone_unit      ON public.phone_purchase_transactions(phone_unit_id);
CREATE INDEX idx_ppt_seller          ON public.phone_purchase_transactions(seller_customer_id);
CREATE INDEX idx_ppt_created         ON public.phone_purchase_transactions(created_at DESC);

CREATE POLICY "ppt_staff_read"
  ON public.phone_purchase_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ---------------------------------------------------------------------------
-- 4. Extend sale_items:
--    a. phone_unit_id FK (nullable — only set for used-phone sale lines)
--    b. Warranty snapshot columns (immutable after sale; template changes won't affect reprints)
--    c. device_snapshot JSONB (model/storage/colour/IMEI/condition/battery etc. at time of sale)
-- ---------------------------------------------------------------------------
ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS phone_unit_id        uuid REFERENCES public.phone_units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warranty_days        integer,     -- NULL = not specified, 0 = no warranty
  ADD COLUMN IF NOT EXISTS warranty_policy_text text,
  ADD COLUMN IF NOT EXISTS warranty_start_date  date,
  ADD COLUMN IF NOT EXISTS warranty_until       date,
  ADD COLUMN IF NOT EXISTS device_snapshot      jsonb;       -- sold-time device details (no cost leak)

CREATE INDEX IF NOT EXISTS idx_sale_items_phone_unit ON public.sale_items(phone_unit_id)
  WHERE phone_unit_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. RPC: buy_phone
--    SECURITY DEFINER function with strict backend validation:
--      - Seller customer ID required & checked
--      - Seller declaration text & timestamp required
--      - Seller age 18+ confirmation required
--      - Cash payment requires open shift ID & open status
--      - IMEI whitespace/dash normalisation & cross-column uniqueness check
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.buy_phone(
  p_idempotency_key         text,
  p_seller_customer_id      uuid,
  p_shift_id                uuid DEFAULT NULL,

  -- Device details (RPC normalises IMEI before insert)
  p_brand                   text DEFAULT NULL,
  p_model                   text DEFAULT NULL,
  p_storage                 text DEFAULT NULL,
  p_colour                  text DEFAULT NULL,
  p_imei1                   text DEFAULT NULL,
  p_imei2                   text DEFAULT NULL,
  p_serial_number           text DEFAULT NULL,

  -- Condition
  p_condition_grade         text DEFAULT 'Good',
  p_condition_notes         text DEFAULT NULL,
  p_battery_health          text DEFAULT NULL,
  p_network_status          text DEFAULT NULL,
  p_activation_lock_status  text DEFAULT NULL,
  p_accessories             text DEFAULT NULL,

  -- Financials
  p_purchase_price_pence    bigint DEFAULT 0,
  p_payment_method          text DEFAULT 'cash',
  p_bank_reference          text DEFAULT NULL,

  -- Declaration & policy (STRICT MANDATORY BACKEND VALIDATION)
  p_seller_declaration_text text DEFAULT NULL,
  p_seller_confirmed_at     timestamptz DEFAULT NULL,
  p_seller_id_check         jsonb DEFAULT NULL,
  p_seller_age_confirmed    boolean DEFAULT false,

  p_notes                   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id       uuid := auth.uid();
  v_imei1_norm      text;
  v_imei2_norm      text;
  v_unit_id         uuid;
  v_ppt_id          uuid;
  v_stock_number    text;
  v_existing_unit   uuid;
BEGIN
  -- Auth
  IF v_caller_id IS NULL OR NOT (public.has_role(v_caller_id, 'admin') OR public.has_role(v_caller_id, 'staff')) THEN
    RAISE EXCEPTION 'Permission denied: admin or staff role required';
  END IF;

  -- Idempotency: return existing result if key already processed
  SELECT id INTO v_ppt_id
  FROM public.phone_purchase_transactions
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    SELECT phone_unit_id INTO v_unit_id
    FROM public.phone_purchase_transactions WHERE id = v_ppt_id;
    SELECT stock_number INTO v_stock_number
    FROM public.phone_units WHERE id = v_unit_id;
    RETURN jsonb_build_object(
      'phone_unit_id',   v_unit_id,
      'stock_number',    v_stock_number,
      'transaction_id',  v_ppt_id,
      'duplicate',       true
    );
  END IF;

  -- Backend validation for seller & declaration
  IF p_seller_customer_id IS NULL THEN
    RAISE EXCEPTION 'Seller customer ID is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_seller_customer_id) THEN
    RAISE EXCEPTION 'Seller customer not found';
  END IF;

  IF p_seller_declaration_text IS NULL OR trim(p_seller_declaration_text) = '' THEN
    RAISE EXCEPTION 'Seller declaration text is required';
  END IF;
  IF p_seller_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Seller declaration confirmation timestamp is required';
  END IF;
  IF NOT COALESCE(p_seller_age_confirmed, false) THEN
    RAISE EXCEPTION 'Seller age confirmation (18+) is required';
  END IF;

  -- Validate device inputs
  IF p_brand IS NULL OR trim(p_brand) = '' THEN
    RAISE EXCEPTION 'Brand is required';
  END IF;
  IF p_model IS NULL OR trim(p_model) = '' THEN
    RAISE EXCEPTION 'Model is required';
  END IF;
  IF p_imei1 IS NULL OR trim(p_imei1) = '' THEN
    RAISE EXCEPTION 'IMEI 1 is required';
  END IF;
  IF p_purchase_price_pence < 0 THEN
    RAISE EXCEPTION 'Purchase price cannot be negative';
  END IF;
  IF p_payment_method NOT IN ('cash','bank_transfer','other') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_payment_method;
  END IF;

  -- Cash payment validation: open shift is mandatory
  IF p_payment_method = 'cash' THEN
    IF p_shift_id IS NULL THEN
      RAISE EXCEPTION 'Open shift ID is required for cash purchases';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.shifts WHERE id = p_shift_id AND status = 'open') THEN
      RAISE EXCEPTION 'Specified shift is not open';
    END IF;
  END IF;

  -- Normalise IMEI: remove spaces, dashes, and dots
  v_imei1_norm := regexp_replace(trim(p_imei1), '[\s\-\.]', '', 'g');
  v_imei2_norm := CASE
    WHEN p_imei2 IS NOT NULL AND trim(p_imei2) <> ''
    THEN regexp_replace(trim(p_imei2), '[\s\-\.]', '', 'g')
    ELSE NULL
  END;

  -- IMEI uniqueness: check imei1 is not already in imei1 column of any active unit
  SELECT id INTO v_existing_unit
  FROM public.phone_units
  WHERE imei1 = v_imei1_norm
  LIMIT 1 FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'An active stock record with IMEI % already exists', v_imei1_norm;
  END IF;

  -- Cross-column IMEI check: imei1 must not appear as any existing imei2
  IF EXISTS (
    SELECT 1 FROM public.phone_units WHERE imei2 = v_imei1_norm
  ) THEN
    RAISE EXCEPTION 'IMEI % is already registered as a secondary IMEI on another unit', v_imei1_norm;
  END IF;

  -- If imei2 provided, ensure it doesn't clash with any imei1 or other imei2
  IF v_imei2_norm IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.phone_units WHERE imei1 = v_imei2_norm) THEN
      RAISE EXCEPTION 'Secondary IMEI % is already registered as a primary IMEI on another unit', v_imei2_norm;
    END IF;
    IF EXISTS (SELECT 1 FROM public.phone_units WHERE imei2 = v_imei2_norm) THEN
      RAISE EXCEPTION 'Secondary IMEI % is already registered as a secondary IMEI on another unit', v_imei2_norm;
    END IF;
    IF v_imei1_norm = v_imei2_norm THEN
      RAISE EXCEPTION 'IMEI 1 and IMEI 2 cannot be identical';
    END IF;
  END IF;

  -- Generate stock number (PHN-YYYY-000001)
  v_stock_number := public.next_doc_number('PHN');

  -- Create phone_unit
  INSERT INTO public.phone_units (
    stock_number, brand, model, storage, colour,
    imei1, imei2, serial_number,
    condition_grade, condition_notes, battery_health,
    network_status, activation_lock_status, accessories,
    purchase_cost_pence, status, purchased_at, created_by
  ) VALUES (
    v_stock_number,
    trim(p_brand), trim(p_model),
    NULLIF(trim(COALESCE(p_storage, '')), ''),
    NULLIF(trim(COALESCE(p_colour, '')), ''),
    v_imei1_norm, v_imei2_norm,
    NULLIF(trim(COALESCE(p_serial_number, '')), ''),
    COALESCE(p_condition_grade, 'Good'),
    NULLIF(trim(COALESCE(p_condition_notes, '')), ''),
    NULLIF(trim(COALESCE(p_battery_health, '')), ''),
    NULLIF(trim(COALESCE(p_network_status, '')), ''),
    NULLIF(trim(COALESCE(p_activation_lock_status, '')), ''),
    NULLIF(trim(COALESCE(p_accessories, '')), ''),
    p_purchase_price_pence,
    'in_stock', now(), v_caller_id
  )
  RETURNING id INTO v_unit_id;

  -- Create phone_purchase_transaction
  INSERT INTO public.phone_purchase_transactions (
    purchase_number, idempotency_key, phone_unit_id,
    seller_customer_id, purchase_price_pence,
    payment_method, bank_reference, shift_id,
    seller_declaration_text, seller_confirmed_at,
    seller_id_check, seller_age_confirmed,
    condition_snapshot, staff_id, notes
  ) VALUES (
    v_stock_number,
    p_idempotency_key,
    v_unit_id,
    p_seller_customer_id,
    p_purchase_price_pence,
    p_payment_method,
    NULLIF(trim(COALESCE(p_bank_reference, '')), ''),
    CASE WHEN p_payment_method = 'cash' THEN p_shift_id ELSE NULL END,
    trim(p_seller_declaration_text),
    p_seller_confirmed_at,
    p_seller_id_check,
    true,
    jsonb_build_object(
      'brand',                  trim(p_brand),
      'model',                  trim(p_model),
      'storage',                p_storage,
      'colour',                 p_colour,
      'imei1',                  v_imei1_norm,
      'imei2',                  v_imei2_norm,
      'serial_number',          p_serial_number,
      'condition_grade',        p_condition_grade,
      'condition_notes',        p_condition_notes,
      'battery_health',         p_battery_health,
      'network_status',         p_network_status,
      'activation_lock_status', p_activation_lock_status,
      'accessories',            p_accessories
    ),
    v_caller_id,
    p_notes
  )
  RETURNING id INTO v_ppt_id;

  -- Till integration: record cash movement if payment is cash
  -- amount_pence stored POSITIVE; close_shift subtracts SUM(phone_buy_out)
  IF p_payment_method = 'cash' AND p_purchase_price_pence > 0 THEN
    INSERT INTO public.cash_movements (
      shift_id, type, amount_pence, note, ref_id, created_by
    ) VALUES (
      p_shift_id,
      'phone_buy_out',
      p_purchase_price_pence,
      'Phone purchased: ' || v_stock_number,
      v_ppt_id,
      v_caller_id
    );
  END IF;

  RETURN jsonb_build_object(
    'phone_unit_id',   v_unit_id,
    'stock_number',    v_stock_number,
    'transaction_id',  v_ppt_id,
    'duplicate',       false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buy_phone TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. RPC: sell_phone
--    SECURITY DEFINER function:
--      - Restricts payment methods strictly to ('cash', 'card', 'bank_transfer')
--      - Open shift mandatory for cash sales
--      - Unit locked with FOR UPDATE & verified in_stock
--      - Device snapshot excludes purchase_cost_pence (stored safely in sale_items.cost_price_pence)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sell_phone(
  p_idempotency_key         text,
  p_phone_unit_id           uuid,
  p_buyer_customer_id       uuid DEFAULT NULL,
  p_shift_id                uuid DEFAULT NULL,
  p_selling_price_pence     bigint DEFAULT 0,
  p_payment_method          text DEFAULT 'cash',
  p_amount_tendered_pence   bigint DEFAULT NULL,

  -- Warranty snapshot
  p_warranty_days           integer DEFAULT NULL,
  p_warranty_policy_text    text DEFAULT NULL,

  p_notes                   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id       uuid := auth.uid();
  v_sale_id         uuid;
  v_inv_number      text;
  v_sale_item_id    uuid;
  v_unit            record;
  v_change          bigint;
  v_warranty_start  date;
  v_warranty_until  date;
  v_pay_method_enum public.payment_method_type;
BEGIN
  -- Auth
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

  -- Validate inputs
  IF p_selling_price_pence < 0 THEN
    RAISE EXCEPTION 'Selling price cannot be negative';
  END IF;

  -- Restrict allowed payment methods strictly to single-payment methods for phone sale
  IF p_payment_method NOT IN ('cash','card','bank_transfer') THEN
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

  -- Lock phone_unit row and verify it is in_stock
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

  -- Create sale_item with:
  --   product_id = NULL
  --   phone_unit_id = this unit
  --   cost_price_pence = original purchase cost (for COGS)
  --   device_snapshot = sold-time device state (no cost leak in snapshot)
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
    v_unit.brand || ' ' || v_unit.model
      || COALESCE(' ' || v_unit.storage, '')
      || COALESCE(' (' || v_unit.colour || ')', ''),
    1,
    p_selling_price_pence, 0, p_selling_price_pence,
    v_unit.purchase_cost_pence,
    p_warranty_days, p_warranty_policy_text,
    v_warranty_start, v_warranty_until,
    jsonb_build_object(
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
      -- purchase_cost_pence omitted to avoid accidental cost leak
    )
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

  -- Mark phone_unit as sold (atomic, same transaction)
  UPDATE public.phone_units
  SET status   = 'sold',
      sold_at  = now()
  WHERE id = p_phone_unit_id;

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

-- ---------------------------------------------------------------------------
-- 7. Update close_shift RPC
--    SECURITY RULE: Explicit caller check (caller IS NULL OR not role -> reject).
--    Subtracts cash phone buy-outs (stored POSITIVE) from expected_cash.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_shift(
  p_shift_id           uuid,
  p_counted_cash_pence bigint,
  p_notes              text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id         uuid := auth.uid();
  v_shift             record;
  v_cash_sales        bigint := 0;
  v_card_sales        bigint := 0;
  v_bank_sales        bigint := 0;
  v_cash_refunds      bigint := 0;
  v_total_refunds     bigint := 0;
  v_expenses          bigint := 0;
  v_repair_payments   bigint := 0;
  v_phone_buy_outs    bigint := 0;
  v_expected_cash     bigint;
  v_difference        bigint;
BEGIN
  -- Strict auth check: caller IS NULL OR not admin/staff -> reject
  IF v_caller_id IS NULL OR NOT (public.has_role(v_caller_id, 'admin') OR public.has_role(v_caller_id, 'staff')) THEN
    RAISE EXCEPTION 'Permission denied: admin or staff role required';
  END IF;

  SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shift not found'; END IF;
  IF v_shift.status = 'closed' THEN RAISE EXCEPTION 'Shift is already closed'; END IF;

  -- Cash/card/bank sales from payments table
  SELECT
    COALESCE(SUM(CASE WHEN method = 'cash'          THEN amount_pence ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN method = 'card'          THEN amount_pence ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN method = 'bank_transfer' THEN amount_pence ELSE 0 END), 0)
  INTO v_cash_sales, v_card_sales, v_bank_sales
  FROM public.payments
  WHERE shift_id = p_shift_id AND ref_type = 'sale';

  -- Cash refunds
  SELECT
    COALESCE(SUM(CASE WHEN refund_method = 'cash' THEN total_pence ELSE 0 END), 0),
    COALESCE(SUM(total_pence), 0)
  INTO v_cash_refunds, v_total_refunds
  FROM public.sale_returns sr
  JOIN public.sales s ON s.id = sr.sale_id
  WHERE s.shift_id = p_shift_id;

  -- Expenses
  SELECT COALESCE(SUM(amount_pence), 0) INTO v_expenses
  FROM public.expenses
  WHERE shift_id = p_shift_id AND is_void = false;

  -- Repair cash payments
  SELECT COALESCE(SUM(amount_pence), 0) INTO v_repair_payments
  FROM public.repair_payments
  WHERE shift_id = p_shift_id AND method = 'cash';

  -- Phone buy-outs (cash paid out to sellers this shift)
  SELECT COALESCE(SUM(amount_pence), 0) INTO v_phone_buy_outs
  FROM public.cash_movements
  WHERE shift_id = p_shift_id AND type = 'phone_buy_out';

  v_expected_cash := v_shift.opening_float_pence
                   + v_cash_sales
                   + v_repair_payments
                   - v_cash_refunds
                   - v_expenses
                   - v_phone_buy_outs;

  v_difference := p_counted_cash_pence - v_expected_cash;

  UPDATE public.shifts SET
    status              = 'closed',
    closed_by           = v_caller_id,
    closed_at           = now(),
    counted_cash_pence  = p_counted_cash_pence,
    expected_cash_pence = v_expected_cash,
    difference_pence    = v_difference,
    notes               = p_notes
  WHERE id = p_shift_id;

  RETURN jsonb_build_object(
    'shift_id',         p_shift_id,
    'cash_sales',       v_cash_sales,
    'card_sales',       v_card_sales,
    'bank_sales',       v_bank_sales,
    'refunds_total',    v_total_refunds,
    'expenses_total',   v_expenses,
    'repair_payments',  v_repair_payments,
    'phone_buy_outs',   v_phone_buy_outs,
    'expected_cash',    v_expected_cash,
    'counted_cash',     p_counted_cash_pence,
    'difference',       v_difference
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_shift TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Update v_shift_reconciliation view to include phone buy-outs
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_shift_reconciliation CASCADE;

CREATE VIEW public.v_shift_reconciliation
WITH (security_invoker = true)
AS
SELECT
  sh.id                                                            AS shift_id,
  sh.opened_at,
  sh.closed_at,
  sh.status,
  sh.opening_float_pence,
  sh.counted_cash_pence,
  sh.expected_cash_pence,
  sh.difference_pence,
  COALESCE(sales_agg.cash_sales_pence, 0)                         AS cash_sales_pence,
  COALESCE(sales_agg.card_sales_pence, 0)                         AS card_sales_pence,
  COALESCE(sales_agg.bank_sales_pence, 0)                         AS bank_sales_pence,
  COALESCE(sales_agg.sale_count, 0)                               AS sale_count,
  COALESCE(repair_agg.repair_cash_pence, 0)                       AS repair_cash_pence,
  COALESCE(refund_agg.cash_refunds_pence, 0)                      AS cash_refunds_pence,
  COALESCE(refund_agg.total_refunds_pence, 0)                     AS total_refunds_pence,
  COALESCE(exp_agg.expenses_pence, 0)                             AS expenses_pence,
  COALESCE(pbo_agg.phone_buy_outs_pence, 0)                       AS phone_buy_outs_pence,
  (
    sh.opening_float_pence +
    COALESCE(sales_agg.cash_sales_pence, 0) +
    COALESCE(repair_agg.repair_cash_pence, 0) -
    COALESCE(refund_agg.cash_refunds_pence, 0) -
    COALESCE(exp_agg.expenses_pence, 0) -
    COALESCE(pbo_agg.phone_buy_outs_pence, 0)
  )                                                               AS computed_expected_cash_pence,
  p.full_name                                                     AS opened_by_name
FROM public.shifts sh
LEFT JOIN public.profiles p ON p.user_id = sh.opened_by
LEFT JOIN LATERAL (
  SELECT
    SUM(CASE WHEN py.method = 'cash'          THEN py.amount_pence ELSE 0 END) AS cash_sales_pence,
    SUM(CASE WHEN py.method = 'card'          THEN py.amount_pence ELSE 0 END) AS card_sales_pence,
    SUM(CASE WHEN py.method = 'bank_transfer' THEN py.amount_pence ELSE 0 END) AS bank_sales_pence,
    COUNT(DISTINCT py.ref_id) AS sale_count
  FROM public.payments py
  WHERE py.shift_id = sh.id AND py.ref_type = 'sale'
) sales_agg ON true
LEFT JOIN LATERAL (
  SELECT SUM(rp.amount_pence) AS repair_cash_pence
  FROM public.repair_payments rp
  WHERE rp.shift_id = sh.id AND rp.method = 'cash'
) repair_agg ON true
LEFT JOIN LATERAL (
  SELECT
    SUM(CASE WHEN sr.refund_method = 'cash' THEN sr.total_pence ELSE 0 END) AS cash_refunds_pence,
    SUM(sr.total_pence) AS total_refunds_pence
  FROM public.sale_returns sr
  JOIN public.sales sa ON sa.id = sr.sale_id
  WHERE sa.shift_id = sh.id
) refund_agg ON true
LEFT JOIN LATERAL (
  SELECT SUM(e.amount_pence) AS expenses_pence
  FROM public.expenses e
  WHERE e.shift_id = sh.id AND e.is_void = false
) exp_agg ON true
LEFT JOIN LATERAL (
  SELECT SUM(cm.amount_pence) AS phone_buy_outs_pence
  FROM public.cash_movements cm
  WHERE cm.shift_id = sh.id AND cm.type = 'phone_buy_out'
) pbo_agg ON true
ORDER BY sh.opened_at DESC;

GRANT SELECT ON public.v_shift_reconciliation TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. v_phone_units_summary — informational reporting view only.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_phone_units_summary CASCADE;

CREATE VIEW public.v_phone_units_summary
WITH (security_invoker = true)
AS
SELECT
  COUNT(*) FILTER (WHERE pu.status = 'in_stock')               AS units_in_stock,
  COUNT(*) FILTER (WHERE pu.status = 'sold')                   AS units_sold,
  COUNT(*)                                                      AS units_total,
  COALESCE(SUM(pu.purchase_cost_pence) FILTER (WHERE pu.status = 'in_stock'), 0)
                                                               AS stock_cost_value_pence,
  COALESCE(SUM(pu.purchase_cost_pence), 0)                    AS total_purchased_pence,
  COALESCE(SUM(si.line_total_pence), 0)                       AS sold_revenue_pence,
  COALESCE(SUM(si.cost_price_pence), 0)                       AS sold_cogs_pence,
  COALESCE(SUM(si.line_total_pence) - SUM(si.cost_price_pence), 0)
                                                               AS gross_margin_pence
FROM public.phone_units pu
LEFT JOIN public.sale_items si ON si.phone_unit_id = pu.id;

GRANT SELECT ON public.v_phone_units_summary TO authenticated;