-- Migration: 20260808_008_opening_stock_import_rpc.sql
-- Description: Bulk opening stock import RPC function with atomic stock_movements logging

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

    IF v_qty < 0 THEN
      RAISE EXCEPTION 'Opening stock quantity cannot be negative for product: %', v_name;
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
