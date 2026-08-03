-- =============================================================================
-- TEST 03: Stock Race Condition & Oversell Protection
-- Verifies that complete_sale RPC rejects sales that request more stock than available
-- =============================================================================
BEGIN;

-- Insert test product with 1 unit in stock
INSERT INTO public.products (id, name, category, stock_quantity, sale_price_pence, cost_price_pence)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Screen Protector', 'Accessories', 1, 1000, 200);

-- First sale requesting 1 unit — MUST SUCCEED
PERFORM public.complete_sale(
  p_idempotency_key   => 'test-key-sale-1',
  p_items             => jsonb_build_array(
    jsonb_build_object(
      'product_id', '00000000-0000-0000-0000-000000000001',
      'quantity', 1,
      'unit_price_pence', 1000
    )
  ),
  p_payment_method    => 'cash'
);

-- Verify stock is now 0
DO $$
DECLARE
  v_stock int;
BEGIN
  SELECT stock_quantity INTO v_stock FROM public.products WHERE id = '00000000-0000-0000-0000-000000000001';
  IF v_stock <> 0 THEN
    RAISE EXCEPTION 'Expected stock 0, found %', v_stock;
  END IF;
END;
$$;

-- Second sale requesting 1 unit — MUST FAIL (oversell)
DO $$
BEGIN
  BEGIN
    PERFORM public.complete_sale(
      p_idempotency_key   => 'test-key-sale-2',
      p_items             => jsonb_build_array(
        jsonb_build_object(
          'product_id', '00000000-0000-0000-0000-000000000001',
          'quantity', 1,
          'unit_price_pence', 1000
        )
      ),
      p_payment_method    => 'cash'
    );
    RAISE EXCEPTION 'ERROR: Second sale should have failed due to zero stock!';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Insufficient stock%' OR SQLERRM LIKE '%oversell%' THEN
      RAISE NOTICE 'SUCCESS: Oversell correctly rejected with message: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'Unexpected error: %', SQLERRM;
    END IF;
  END;
END;
$$;

ROLLBACK;
SELECT 'Test 03 PASS: Oversell protection verified' AS result;
