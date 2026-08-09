-- =============================================================================
-- MIGRATION 006: supplier_ledger_rpcs
-- Prescot Mobiles ERP — Supplier Payment RPCs
--
-- record_supplier_payment():
--   - Validates caller role, supplier, PO ownership, overpayment
--   - Idempotency-keyed (returns existing on duplicate submission)
--   - Always writes supplier_payment_allocations rows
--   - If no PO specified: FIFO auto-allocation against oldest outstanding GRNs
--
-- void_supplier_payment():
--   - Admin only, soft-void with reason (no hard deletes)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. record_supplier_payment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_supplier_payment(
  p_supplier_id         uuid,
  p_amount_pence        bigint,
  p_method              text          DEFAULT ''bank_transfer'',
  p_idempotency_key     text          DEFAULT NULL,
  p_purchase_order_id   uuid          DEFAULT NULL,
  p_reference           text          DEFAULT NULL,
  p_notes               text          DEFAULT NULL,
  p_payment_date        date          DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id         uuid := auth.uid();
  v_payment_id        uuid;
  v_balance_pence     bigint;
  v_remaining         bigint;
  v_grn               record;
  v_alloc_amount      bigint;
BEGIN
  -- -------------------------------------------------------------------------
  -- 1. Auth: admin or staff required
  -- -------------------------------------------------------------------------
  IF v_caller_id IS NOT NULL AND NOT (
    public.has_role(v_caller_id, ''admin'') OR public.has_role(v_caller_id, ''staff'')
  ) THEN
    RAISE EXCEPTION ''Permission denied: admin or staff role required'';
  END IF;

  -- -------------------------------------------------------------------------
  -- 2. Basic validation
  -- -------------------------------------------------------------------------
  IF p_amount_pence <= 0 THEN
    RAISE EXCEPTION ''Payment amount must be greater than zero'';
  END IF;

  IF p_idempotency_key IS NULL OR trim(p_idempotency_key) = '''' THEN
    RAISE EXCEPTION ''idempotency_key is required'';
  END IF;

  -- -------------------------------------------------------------------------
  -- 3. Idempotency: if this key was already processed, return existing result
  -- -------------------------------------------------------------------------
  SELECT id INTO v_payment_id
  FROM public.supplier_payments
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      ''payment_id'', v_payment_id,
      ''duplicate'',  true
    );
  END IF;

  -- -------------------------------------------------------------------------
  -- 4. Validate supplier exists
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE id = p_supplier_id) THEN
    RAISE EXCEPTION ''Supplier not found'';
  END IF;

  -- -------------------------------------------------------------------------
  -- 5. Validate PO belongs to this supplier (if specified)
  -- -------------------------------------------------------------------------
  IF p_purchase_order_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.purchase_orders
      WHERE id = p_purchase_order_id
        AND supplier_id = p_supplier_id
    ) THEN
      RAISE EXCEPTION ''Purchase order does not belong to selected supplier'';
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- 6. Overpayment protection: payment must not exceed outstanding balance
  -- -------------------------------------------------------------------------
  SELECT COALESCE(balance_pence, 0)
  INTO v_balance_pence
  FROM public.v_supplier_balances
  WHERE id = p_supplier_id;

  IF v_balance_pence IS NULL THEN
    v_balance_pence := 0;
  END IF;

  IF p_amount_pence > v_balance_pence THEN
    RAISE EXCEPTION
      ''Payment of £%.2f exceeds outstanding supplier balance of £%.2f'',
      (p_amount_pence::numeric / 100),
      (v_balance_pence::numeric / 100);
  END IF;

  -- -------------------------------------------------------------------------
  -- 7. INSERT payment record
  -- -------------------------------------------------------------------------
  INSERT INTO public.supplier_payments (
    supplier_id, purchase_order_id, amount_pence, method,
    reference, notes, payment_date, idempotency_key,
    is_void, created_by
  ) VALUES (
    p_supplier_id, p_purchase_order_id, p_amount_pence, p_method,
    p_reference, p_notes, p_payment_date, p_idempotency_key,
    false, v_caller_id
  )
  RETURNING id INTO v_payment_id;

  -- -------------------------------------------------------------------------
  -- 8. Allocation: always write supplier_payment_allocations
  --
  --    Case A: p_purchase_order_id provided
  --      → allocate against GRNs belonging to that PO (FIFO by received_at)
  --
  --    Case B: no PO specified
  --      → FIFO auto-allocation across oldest outstanding GRNs for this supplier
  -- -------------------------------------------------------------------------
  v_remaining := p_amount_pence;

  IF p_purchase_order_id IS NOT NULL THEN
    -- Case A: allocate to GRNs of the specified PO, oldest first
    FOR v_grn IN
      SELECT grn_id, outstanding_pence
      FROM public.v_grn_outstanding
      WHERE supplier_id = p_supplier_id
        AND purchase_order_id = p_purchase_order_id
      ORDER BY grn_date ASC, grn_at ASC, grn_id ASC
    LOOP
      EXIT WHEN v_remaining <= 0;

      v_alloc_amount := LEAST(v_remaining, v_grn.outstanding_pence);

      INSERT INTO public.supplier_payment_allocations
        (payment_id, purchase_order_id, grn_id, amount_pence)
      VALUES
        (v_payment_id, p_purchase_order_id, v_grn.grn_id, v_alloc_amount);

      v_remaining := v_remaining - v_alloc_amount;
    END LOOP;
  ELSE
    -- Case B: FIFO across ALL outstanding GRNs for this supplier (oldest first)
    FOR v_grn IN
      SELECT grn_id, purchase_order_id, outstanding_pence
      FROM public.v_grn_outstanding
      WHERE supplier_id = p_supplier_id
      ORDER BY grn_date ASC, grn_at ASC, grn_id ASC
    LOOP
      EXIT WHEN v_remaining <= 0;

      v_alloc_amount := LEAST(v_remaining, v_grn.outstanding_pence);

      INSERT INTO public.supplier_payment_allocations
        (payment_id, purchase_order_id, grn_id, amount_pence)
      VALUES
        (v_payment_id, v_grn.purchase_order_id, v_grn.grn_id, v_alloc_amount);

      v_remaining := v_remaining - v_alloc_amount;
    END LOOP;
  END IF;

  -- -------------------------------------------------------------------------
  -- 9. Return result
  -- -------------------------------------------------------------------------
  SELECT COALESCE(balance_pence, 0)
  INTO v_balance_pence
  FROM public.v_supplier_balances
  WHERE id = p_supplier_id;

  RETURN jsonb_build_object(
    ''payment_id'',      v_payment_id,
    ''duplicate'',       false,
    ''new_balance_pence'', COALESCE(v_balance_pence, 0)
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. void_supplier_payment (admin only, soft-void)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.void_supplier_payment(
  p_payment_id  uuid,
  p_void_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id  uuid := auth.uid();
  v_supplier_id uuid;
BEGIN
  -- Auth: admin only
  IF v_caller_id IS NOT NULL AND NOT public.has_role(v_caller_id, ''admin'') THEN
    RAISE EXCEPTION ''Permission denied: admin role required to void payments'';
  END IF;

  -- Reason is mandatory
  IF p_void_reason IS NULL OR trim(p_void_reason) = '''' THEN
    RAISE EXCEPTION ''A void reason is required'';
  END IF;

  -- Validate payment exists and is not already voided
  SELECT supplier_id INTO v_supplier_id
  FROM public.supplier_payments
  WHERE id = p_payment_id AND is_void = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Payment not found or already voided'';
  END IF;

  -- Soft-void (allocation rows remain for audit — excluded via is_void join)
  UPDATE public.supplier_payments
  SET
    is_void     = true,
    void_reason = p_void_reason,
    voided_by   = v_caller_id,
    voided_at   = now()
  WHERE id = p_payment_id;

  -- Return new balance after void
  RETURN jsonb_build_object(
    ''voided'',           true,
    ''payment_id'',       p_payment_id,
    ''new_balance_pence'', COALESCE(
      (SELECT balance_pence FROM public.v_supplier_balances WHERE id = v_supplier_id),
      0
    )
  );
END;
$$;
