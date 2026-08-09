-- Migration: 20260808_009_sku_and_barcode_improvements.sql
-- Description: Hardened SKU auto-generation, case-insensitive SKU index, restricted table/function permissions, and value validation.

-- 1. Ensure 'opening_count' exists in movement_type enum before migration execution
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'movement_type' AND e.enumlabel = 'opening_count'
  ) THEN
    ALTER TYPE public.movement_type ADD VALUE 'opening_count';
  END IF;
END $$;

-- 2. Product SKU sequences table (Restricted permissions)
CREATE TABLE IF NOT EXISTS public.product_sku_sequences (
  prefix text PRIMARY KEY,
  last_seq bigint NOT NULL DEFAULT 0
);

ALTER TABLE public.product_sku_sequences ENABLE ROW LEVEL SECURITY;

-- Remove direct INSERT/UPDATE/DELETE access for authenticated users; grant SELECT only
REVOKE ALL ON public.product_sku_sequences FROM authenticated, public;
GRANT SELECT ON public.product_sku_sequences TO authenticated;
GRANT ALL ON public.product_sku_sequences TO service_role;

DROP POLICY IF EXISTS "sku_seq_authenticated_all" ON public.product_sku_sequences;
DROP POLICY IF EXISTS "sku_seq_authenticated_select" ON public.product_sku_sequences;
CREATE POLICY "sku_seq_authenticated_select"
  ON public.product_sku_sequences FOR SELECT TO authenticated USING (true);

-- 3. Case-insensitive unique index on UPPER(sku) for non-null/non-empty SKUs
DROP INDEX IF EXISTS public.idx_products_sku;
DROP INDEX IF EXISTS public.idx_products_sku_upper;
CREATE UNIQUE INDEX idx_products_sku_upper
  ON public.products(UPPER(sku))
  WHERE sku IS NOT NULL AND sku <> '';

-- 4. Atomic SKU generator function (SECURITY DEFINER, limited execution grant)
CREATE OR REPLACE FUNCTION public.generate_next_sku(
  p_category text,
  p_type text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prefix   text;
  v_seq      bigint;
  v_sku      text;
  v_cat_norm text;
  v_exists   boolean;
BEGIN
  -- Determine prefix based on type & category
  IF p_type = 'part' THEN
    v_prefix := 'PART';
  ELSIF p_type = 'service' THEN
    v_prefix := 'SRV';
  ELSE
    v_cat_norm := UPPER(COALESCE(p_category, ''));
    IF v_cat_norm LIKE '%ACCESSO%' OR v_cat_norm LIKE '%ACC%' THEN
      v_prefix := 'ACC';
    ELSIF v_cat_norm LIKE '%PHONE%' OR v_cat_norm LIKE '%MOBILE%' OR v_cat_norm LIKE '%HANDSET%' THEN
      v_prefix := 'PHONE';
    ELSE
      -- Clean category string to uppercase alphanumeric characters
      v_cat_norm := REGEXP_REPLACE(v_cat_norm, '[^A-Z0-9]', '', 'g');
      IF LENGTH(v_cat_norm) >= 3 THEN
        v_prefix := SUBSTRING(v_cat_norm FROM 1 FOR 5);
      ELSE
        v_prefix := 'ACC';
      END IF;
    END IF;
  END IF;

  -- Atomic sequence increment with case-insensitive uniqueness check
  LOOP
    INSERT INTO public.product_sku_sequences (prefix, last_seq)
    VALUES (v_prefix, 1)
    ON CONFLICT (prefix)
    DO UPDATE SET last_seq = product_sku_sequences.last_seq + 1
    RETURNING last_seq INTO v_seq;

    v_sku := v_prefix || '-' || LPAD(v_seq::text, 6, '0');

    -- Verify uniqueness against existing products table (case-insensitive)
    SELECT EXISTS(
      SELECT 1 FROM public.products WHERE UPPER(sku) = UPPER(v_sku)
    ) INTO v_exists;

    IF NOT v_exists THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN v_sku;
END;
$$;

-- Do not expose generate_next_sku directly to normal authenticated users
REVOKE EXECUTE ON FUNCTION public.generate_next_sku(text, text) FROM public, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_next_sku(text, text) TO service_role;

-- 5. Before insert/update trigger function with explicit numeric validations & auto SKU assignment
CREATE OR REPLACE FUNCTION public.trg_products_auto_sku_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Trim name and category
  IF NEW.name IS NOT NULL THEN
    NEW.name := TRIM(NEW.name);
  END IF;
  IF NEW.category IS NOT NULL THEN
    NEW.category := TRIM(NEW.category);
  END IF;

  -- Explicit numeric bound validations
  IF NEW.cost_price_pence < 0 THEN
    RAISE EXCEPTION 'Cost price cannot be negative';
  END IF;
  IF NEW.sale_price_pence < 0 THEN
    RAISE EXCEPTION 'Sale price cannot be negative';
  END IF;
  IF NEW.low_stock_threshold < 0 THEN
    RAISE EXCEPTION 'Low stock threshold cannot be negative';
  END IF;
  IF NEW.warranty_days < 0 THEN
    RAISE EXCEPTION 'Warranty days cannot be negative';
  END IF;

  -- Normalize empty strings to NULL
  NEW.sku := NULLIF(TRIM(NEW.sku), '');
  NEW.barcode := NULLIF(TRIM(NEW.barcode), '');

  -- Auto generate SKU if inserting and SKU is NULL
  IF TG_OP = 'INSERT' AND NEW.sku IS NULL THEN
    NEW.sku := public.generate_next_sku(NEW.category, NEW.type);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Keep SKU stable on UPDATE: if updated NEW.sku is NULL but OLD.sku exists, preserve OLD.sku
    IF NEW.sku IS NULL AND OLD.sku IS NOT NULL THEN
      NEW.sku := OLD.sku;
    ELSIF NEW.sku IS NULL AND OLD.sku IS NULL THEN
      NEW.sku := public.generate_next_sku(NEW.category, NEW.type);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_auto_sku ON public.products;
CREATE TRIGGER trg_products_auto_sku
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.trg_products_auto_sku_func();

-- 6. Updated bulk_import_opening_stock RPC supporting blank SKU/barcode, explicit numeric validation, and atomic duplicate checks
CREATE OR REPLACE FUNCTION public.bulk_import_opening_stock(
  p_products jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id   uuid;
  v_is_staff    boolean;
  v_elem        jsonb;
  v_count       integer := 0;
  v_prod_id     uuid;
  v_qty         integer;
  v_name        text;
  v_category    text;
  v_sku         text;
  v_barcode     text;
  v_type        text;
  v_cost_pence  bigint;
  v_sale_pence  bigint;
  v_low_stock   integer;
  v_warranty    integer;
BEGIN
  -- Authenticate caller
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated caller';
  END IF;

  -- Authorization check: caller must be admin or staff
  SELECT (
    public.has_role(v_caller_id, 'admin') OR
    public.has_role(v_caller_id, 'staff')
  ) INTO v_is_staff;

  IF NOT v_is_staff THEN
    RAISE EXCEPTION 'Forbidden: only admin or staff can import opening stock';
  END IF;

  -- Validate input payload is a JSON array
  IF jsonb_typeof(p_products) <> 'array' OR jsonb_array_length(p_products) = 0 THEN
    RAISE EXCEPTION 'Payload must be a non-empty array of product objects';
  END IF;

  -- Loop through products and insert atomically
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_products)
  LOOP
    v_name       := TRIM(v_elem->>'name');
    v_category   := TRIM(v_elem->>'category');
    v_sku        := NULLIF(TRIM(v_elem->>'sku'), '');
    v_barcode    := NULLIF(TRIM(v_elem->>'barcode'), '');
    v_type       := COALESCE(NULLIF(TRIM(v_elem->>'type'), ''), 'product');
    v_cost_pence := COALESCE((v_elem->>'cost_price_pence')::bigint, 0);
    v_sale_pence := COALESCE((v_elem->>'sale_price_pence')::bigint, 0);
    v_qty        := COALESCE((v_elem->>'stock_quantity')::integer, 0);
    v_low_stock  := COALESCE((v_elem->>'low_stock_threshold')::integer, 5);
    v_warranty   := COALESCE((v_elem->>'warranty_days')::integer, 0);

    IF v_name IS NULL OR v_name = '' THEN
      RAISE EXCEPTION 'Product name is required for all import items';
    END IF;

    IF v_category IS NULL OR v_category = '' THEN
      RAISE EXCEPTION 'Category is required for product: %', v_name;
    END IF;

    IF v_cost_pence < 0 THEN
      RAISE EXCEPTION 'Cost price cannot be negative for product: %', v_name;
    END IF;

    IF v_sale_pence < 0 THEN
      RAISE EXCEPTION 'Sale price cannot be negative for product: %', v_name;
    END IF;

    IF v_qty < 0 THEN
      RAISE EXCEPTION 'Opening stock quantity cannot be negative for product: %', v_name;
    END IF;

    IF v_low_stock < 0 THEN
      RAISE EXCEPTION 'Low stock threshold cannot be negative for product: %', v_name;
    END IF;

    IF v_warranty < 0 THEN
      RAISE EXCEPTION 'Warranty days cannot be negative for product: %', v_name;
    END IF;

    -- Check barcode uniqueness against existing DB rows if barcode provided
    IF v_barcode IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.products WHERE barcode = v_barcode) THEN
        RAISE EXCEPTION 'Barcode "%" is already assigned to an existing product in database', v_barcode;
      END IF;
    END IF;

    -- Check SKU uniqueness against existing DB rows if manual SKU provided (case-insensitive)
    IF v_sku IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.products WHERE UPPER(sku) = UPPER(v_sku)) THEN
        RAISE EXCEPTION 'SKU "%" is already assigned to an existing product in database', v_sku;
      END IF;
    ELSE
      -- Auto generate unique SKU
      v_sku := public.generate_next_sku(v_category, v_type);
    END IF;

    -- Insert product
    INSERT INTO public.products (
      name,
      category,
      sku,
      barcode,
      type,
      track_type,
      cost_price_pence,
      sale_price_pence,
      avg_cost_pence,
      stock_quantity,
      low_stock_threshold,
      warranty_days,
      status
    ) VALUES (
      v_name,
      v_category,
      v_sku,
      v_barcode,
      v_type::public.product_type,
      'quantity',
      v_cost_pence,
      v_sale_pence,
      v_cost_pence,
      v_qty,
      v_low_stock,
      v_warranty,
      'active'
    )
    RETURNING id INTO v_prod_id;

    -- Audit movement log for opening stock if qty > 0
    IF v_qty > 0 THEN
      INSERT INTO public.stock_movements (
        product_id,
        movement_type,
        qty_change,
        qty_before,
        qty_after,
        unit_cost_pence,
        reason,
        note,
        ref_id,
        created_by
      ) VALUES (
        v_prod_id,
        'opening_count'::public.movement_type,
        v_qty,
        0,
        v_qty,
        v_cost_pence,
        'Initial opening stock setup',
        'Bulk Opening Stock Import',
        v_prod_id,
        v_caller_id
      );
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'imported_count', v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_import_opening_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_import_opening_stock TO service_role;

-- 7. Updated adjust_stock RPC with support for opening_count and damage movement types
CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_product_id    uuid,
  p_qty_change    integer,
  p_reason        text DEFAULT 'adjustment',
  p_note          text DEFAULT NULL,
  p_approved_by   uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id  uuid := auth.uid();
  v_product    record;
  v_adj_number text;
  v_new_stock  integer;
  v_mov_type   public.movement_type;
BEGIN
  IF v_caller_id IS NOT NULL AND NOT (public.has_role(v_caller_id, 'admin') OR public.has_role(v_caller_id, 'staff')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Non-admin staff must have admin approval
  IF NOT public.has_role(v_caller_id, 'admin') THEN
    IF p_approved_by IS NULL THEN
      RAISE EXCEPTION 'Stock adjustments by non-admin staff require manager approval (p_approved_by)';
    END IF;
    IF NOT public.has_role(p_approved_by, 'admin') THEN
      RAISE EXCEPTION 'Approver must have admin role';
    END IF;
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;

  v_new_stock := v_product.stock_quantity + p_qty_change;
  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Adjustment would result in negative stock (current: %, change: %)',
      v_product.stock_quantity, p_qty_change;
  END IF;

  v_adj_number := public.next_doc_number('ADJ');

  UPDATE public.products SET stock_quantity = v_new_stock WHERE id = p_product_id;

  IF p_reason = 'damage' THEN
    v_mov_type := 'damage'::public.movement_type;
  ELSIF p_reason = 'opening_count' THEN
    v_mov_type := 'opening_count'::public.movement_type;
  ELSE
    v_mov_type := 'adjustment'::public.movement_type;
  END IF;

  INSERT INTO public.stock_movements (
    product_id, movement_type, qty_change, qty_before, qty_after,
    unit_cost_pence, reason, adj_number, note, created_by
  ) VALUES (
    p_product_id,
    v_mov_type,
    p_qty_change, v_product.stock_quantity, v_new_stock,
    v_product.avg_cost_pence,
    p_reason, v_adj_number, p_note, v_caller_id
  );

  RETURN jsonb_build_object(
    'adj_number', v_adj_number,
    'qty_before', v_product.stock_quantity,
    'qty_after',  v_new_stock
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock TO service_role;

