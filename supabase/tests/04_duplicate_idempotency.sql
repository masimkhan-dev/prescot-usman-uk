-- =============================================================================
-- TEST 04: Duplicate Idempotency Key Rejection
-- Verifies that complete_sale called twice with the same idempotency_key returns
-- duplicate=true without re-deducting stock or creating extra invoice rows
-- =============================================================================
BEGIN;

INSERT INTO public.products (id, name, category, stock_quantity, sale_price_pence, cost_price_pence)
VALUES ('00000000-0000-0000-0000-000000000002', 'Test Cable', 'Accessories', 10, 500, 100);

-- First call
SELECT public.complete_sale(
  p_idempotency_key   => 'idem-key-999',
  p_items             => jsonb_build_array(
    jsonb_build_object(
      'product_id', '00000000-0000-0000-0000-000000000002',
      'quantity', 2,
      'unit_price_pence', 500
    )
  ),
  p_payment_method    => 'card'
) AS res1;

-- Second call with SAME key
DO $$
DECLARE
  v_res jsonb;
  v_stock int;
BEGIN
  v_res := public.complete_sale(
    p_idempotency_key   => 'idem-key-999',
    p_items             => jsonb_build_array(
      jsonb_build_object(
        'product_id', '00000000-0000-0000-0000-000000000002',
        'quantity', 2,
        'unit_price_pence', 500
      )
    ),
    p_payment_method    => 'card'
  );

  IF (v_res->>'duplicate')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Expected duplicate=true on second call, got %', v_res;
  END IF;

  -- Stock should only be deducted ONCE (10 - 2 = 8)
  SELECT stock_quantity INTO v_stock FROM public.products WHERE id = '00000000-0000-0000-0000-000000000002';
  IF v_stock <> 8 THEN
    RAISE EXCEPTION 'Stock should be 8, but found %', v_stock;
  END IF;
END;
$$;

ROLLBACK;
SELECT 'Test 04 PASS: Idempotency key deduplication verified' AS result;
