-- =============================================================================
-- SUPPLIER LEDGER — COMPLETE SQL SCRIPT
-- Prescot Mobiles ERP
-- Run in Supabase SQL Editor (single execution)
-- Safe to re-run: uses IF NOT EXISTS / DO $$ guards throughout
-- =============================================================================

-- ============================================================
-- PART 1: ALTER supplier_payments
-- Adds: idempotency_key, soft-void columns, created_by, indexes
-- ============================================================

ALTER TABLE public.supplier_payments
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Back-fill existing rows before making NOT NULL
UPDATE public.supplier_payments
  SET idempotency_key = 'legacy-' || id::text
  WHERE idempotency_key IS NULL;

ALTER TABLE public.supplier_payments
  ALTER COLUMN idempotency_key SET NOT NULL;

-- Unique constraint (idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.supplier_payments'::regclass
      AND conname = 'supplier_payments_idempotency_key_key'
  ) THEN
    ALTER TABLE public.supplier_payments
      ADD CONSTRAINT supplier_payments_idempotency_key_key UNIQUE (idempotency_key);
  END IF;
END$$;

-- Soft-void columns (no hard deletes on financial records)
ALTER TABLE public.supplier_payments
  ADD COLUMN IF NOT EXISTS is_void     boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS voided_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voided_at   timestamptz,
  ADD COLUMN IF NOT EXISTS created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_payments_idempotency
  ON public.supplier_payments(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_void
  ON public.supplier_payments(supplier_id, is_void, payment_date DESC);

-- RLS: admin soft-void (UPDATE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'supplier_payments'
      AND policyname = 'supplier_payments_admin_void'
  ) THEN
    CREATE POLICY "supplier_payments_admin_void"
      ON public.supplier_payments FOR UPDATE TO authenticated
      USING  (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END$$;

-- RLS: staff/admin INSERT payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'supplier_payments'
      AND policyname = 'supplier_payments_staff_insert'
  ) THEN
    CREATE POLICY "supplier_payments_staff_insert"
      ON public.supplier_payments FOR INSERT TO authenticated
      WITH CHECK (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'staff')
      );
  END IF;
END$$;

GRANT INSERT, UPDATE ON public.supplier_payments TO authenticated;


-- ============================================================
-- PART 2: CREATE supplier_payment_allocations
-- Always written — enables allocation-aware aging
-- ============================================================

CREATE TABLE IF NOT EXISTS public.supplier_payment_allocations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id        uuid NOT NULL
                      REFERENCES public.supplier_payments(id) ON DELETE RESTRICT,
  purchase_order_id uuid
                      REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  grn_id            uuid
                      REFERENCES public.goods_receipts(id) ON DELETE SET NULL,
  amount_pence      bigint NOT NULL CHECK (amount_pence > 0),
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_payment_allocations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.supplier_payment_allocations TO authenticated;
GRANT ALL            ON public.supplier_payment_allocations TO service_role;

CREATE INDEX IF NOT EXISTS idx_spa_payment
  ON public.supplier_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_spa_grn
  ON public.supplier_payment_allocations(grn_id);
CREATE INDEX IF NOT EXISTS idx_spa_po
  ON public.supplier_payment_allocations(purchase_order_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'supplier_payment_allocations'
      AND policyname = 'spa_staff_read'
  ) THEN
    CREATE POLICY "spa_staff_read"
      ON public.supplier_payment_allocations FOR SELECT TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'staff')
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'supplier_payment_allocations'
      AND policyname = 'spa_staff_insert'
  ) THEN
    CREATE POLICY "spa_staff_insert"
      ON public.supplier_payment_allocations FOR INSERT TO authenticated
      WITH CHECK (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'staff')
      );
  END IF;
END$$;


-- ============================================================
-- PART 3: VIEWS
-- ============================================================

-- Drop in reverse dependency order (most-dependent first)
DROP VIEW IF EXISTS public.v_supplier_aging    CASCADE;
DROP VIEW IF EXISTS public.v_supplier_balances CASCADE;
DROP VIEW IF EXISTS public.v_grn_outstanding   CASCADE;
DROP VIEW IF EXISTS public.v_supplier_ledger   CASCADE;

-- ------------------------------------------------------------
-- 3a. v_supplier_ledger
--     Chronological debit/credit stream per supplier.
--     Explicit debit_pence / credit_pence / signed_amount_pence.
--     Deterministic sort: txn_at, created_at, source_id.
--     Voided payments excluded.
-- ------------------------------------------------------------
CREATE VIEW public.v_supplier_ledger AS

  -- GRN Invoices = Debit (we OWE the supplier)
  SELECT
    po.supplier_id,
    gr.received_at                                        AS txn_at,
    gr.received_at::date                                  AS txn_date,
    gr.received_at                                        AS created_at,
    gr.id                                                 AS source_id,
    gr.grn_number                                         AS reference,
    'invoice'::text                                       AS txn_type,
    po.po_number                                          AS po_reference,
    gr.purchase_order_id,
    SUM(gri.qty_received * gri.unit_cost_pence)           AS debit_pence,
    0::bigint                                             AS credit_pence,
    SUM(gri.qty_received * gri.unit_cost_pence)           AS signed_amount_pence
  FROM public.goods_receipts      gr
  JOIN public.goods_receipt_items gri ON gri.grn_id = gr.id
  JOIN public.purchase_orders     po  ON po.id = gr.purchase_order_id
  GROUP BY
    po.supplier_id, gr.id, gr.received_at,
    gr.grn_number, po.po_number, gr.purchase_order_id

UNION ALL

  -- Payments = Credit (we PAID the supplier)
  SELECT
    sp.supplier_id,
    sp.created_at                                         AS txn_at,
    sp.payment_date                                       AS txn_date,
    sp.created_at,
    sp.id                                                 AS source_id,
    COALESCE(sp.reference, 'PAYMENT')                     AS reference,
    'payment'::text                                       AS txn_type,
    po.po_number                                          AS po_reference,
    sp.purchase_order_id,
    0::bigint                                             AS debit_pence,
    sp.amount_pence                                       AS credit_pence,
    -(sp.amount_pence)                                    AS signed_amount_pence
  FROM public.supplier_payments sp
  LEFT JOIN public.purchase_orders po ON po.id = sp.purchase_order_id
  WHERE sp.is_void = false;

GRANT SELECT ON public.v_supplier_ledger TO authenticated;


-- ------------------------------------------------------------
-- 3b. v_grn_outstanding
--     Per-GRN remaining balance using allocation rows.
--     Source of truth for allocation-aware aging.
--     Only GRNs with outstanding_pence > 0 appear here.
-- ------------------------------------------------------------
CREATE VIEW public.v_grn_outstanding AS
WITH grn_totals AS (
  SELECT
    gr.id                                             AS grn_id,
    po.supplier_id,
    gr.received_at::date                              AS grn_date,
    gr.received_at                                    AS grn_at,
    gr.purchase_order_id,
    gr.grn_number,
    SUM(gri.qty_received * gri.unit_cost_pence)       AS grn_amount_pence
  FROM public.goods_receipts      gr
  JOIN public.goods_receipt_items gri ON gri.grn_id = gr.id
  JOIN public.purchase_orders     po  ON po.id = gr.purchase_order_id
  GROUP BY
    gr.id, po.supplier_id, gr.received_at, gr.purchase_order_id, gr.grn_number
),
allocated AS (
  SELECT
    spa.grn_id,
    SUM(spa.amount_pence)     AS paid_pence
  FROM public.supplier_payment_allocations spa
  JOIN public.supplier_payments sp ON sp.id = spa.payment_id
  WHERE sp.is_void = false
    AND spa.grn_id IS NOT NULL
  GROUP BY spa.grn_id
)
SELECT
  gt.supplier_id,
  gt.grn_id,
  gt.purchase_order_id,
  gt.grn_number,
  gt.grn_date,
  gt.grn_at,
  gt.grn_amount_pence,
  COALESCE(al.paid_pence, 0)                                        AS paid_pence,
  GREATEST(gt.grn_amount_pence - COALESCE(al.paid_pence, 0), 0)    AS outstanding_pence,
  (CURRENT_DATE - gt.grn_date)                                      AS days_old
FROM grn_totals gt
LEFT JOIN allocated al ON al.grn_id = gt.grn_id
WHERE GREATEST(gt.grn_amount_pence - COALESCE(al.paid_pence, 0), 0) > 0;

GRANT SELECT ON public.v_grn_outstanding TO authenticated;


-- ------------------------------------------------------------
-- 3c. v_supplier_balances
--     Per-supplier summary: invoiced, paid, balance, aging metadata.
--     oldest_unpaid_date = allocation-aware (from v_grn_outstanding).
-- ------------------------------------------------------------
CREATE VIEW public.v_supplier_balances AS
WITH paid_totals AS (
  SELECT
    supplier_id,
    SUM(amount_pence)     AS total_paid_pence,
    MAX(payment_date)     AS last_payment_date
  FROM public.supplier_payments
  WHERE is_void = false
  GROUP BY supplier_id
),
invoiced_totals AS (
  SELECT
    po.supplier_id,
    SUM(gri.qty_received * gri.unit_cost_pence)   AS total_invoiced_pence
  FROM public.goods_receipts      gr
  JOIN public.goods_receipt_items gri ON gri.grn_id = gr.id
  JOIN public.purchase_orders     po  ON po.id = gr.purchase_order_id
  GROUP BY po.supplier_id
),
oldest_unpaid AS (
  SELECT
    supplier_id,
    MIN(grn_date)     AS oldest_unpaid_date,
    MAX(days_old)     AS days_outstanding
  FROM public.v_grn_outstanding
  GROUP BY supplier_id
)
SELECT
  s.id,
  s.name,
  s.phone,
  s.email,
  s.address,
  COALESCE(it.total_invoiced_pence, 0)                          AS total_invoiced_pence,
  COALESCE(pt.total_paid_pence,     0)                          AS total_paid_pence,
  COALESCE(it.total_invoiced_pence, 0)
    - COALESCE(pt.total_paid_pence, 0)                          AS balance_pence,
  pt.last_payment_date,
  ou.oldest_unpaid_date,
  ou.days_outstanding
FROM public.suppliers s
LEFT JOIN invoiced_totals it ON it.supplier_id = s.id
LEFT JOIN paid_totals     pt ON pt.supplier_id = s.id
LEFT JOIN oldest_unpaid   ou ON ou.supplier_id = s.id;

GRANT SELECT ON public.v_supplier_balances TO authenticated;


-- ------------------------------------------------------------
-- 3d. v_supplier_aging
--     True per-bucket monetary AP aging from v_grn_outstanding.
--     Each GRN outstanding goes into ONE bucket by its age.
-- ------------------------------------------------------------
CREATE VIEW public.v_supplier_aging AS
SELECT
  go.supplier_id,
  s.name                                                          AS supplier_name,
  SUM(CASE WHEN go.days_old <= 30
        THEN go.outstanding_pence ELSE 0 END)                     AS bucket_0_30,
  SUM(CASE WHEN go.days_old BETWEEN 31 AND 60
        THEN go.outstanding_pence ELSE 0 END)                     AS bucket_31_60,
  SUM(CASE WHEN go.days_old BETWEEN 61 AND 90
        THEN go.outstanding_pence ELSE 0 END)                     AS bucket_61_90,
  SUM(CASE WHEN go.days_old > 90
        THEN go.outstanding_pence ELSE 0 END)                     AS bucket_90_plus,
  SUM(go.outstanding_pence)                                       AS total_outstanding_pence,
  MIN(go.grn_date)                                                AS oldest_unpaid_date,
  MAX(go.days_old)                                                AS days_outstanding
FROM public.v_grn_outstanding go
JOIN public.suppliers s ON s.id = go.supplier_id
GROUP BY go.supplier_id, s.name;

GRANT SELECT ON public.v_supplier_aging TO authenticated;


-- ============================================================
-- PART 4: RPCs
-- ============================================================

-- ------------------------------------------------------------
-- 4a. record_supplier_payment()
--     - Auth: admin or staff
--     - Idempotency: returns existing on duplicate key
--     - Validates PO belongs to supplier
--     - Overpayment protection
--     - ALWAYS writes allocation rows (FIFO if no PO given)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_supplier_payment(
  p_supplier_id         uuid,
  p_amount_pence        bigint,
  p_method              text    DEFAULT 'bank_transfer',
  p_idempotency_key     text    DEFAULT NULL,
  p_purchase_order_id   uuid    DEFAULT NULL,
  p_reference           text    DEFAULT NULL,
  p_notes               text    DEFAULT NULL,
  p_payment_date        date    DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id      uuid := auth.uid();
  v_payment_id     uuid;
  v_balance_pence  bigint;
  v_remaining      bigint;
  v_grn            record;
  v_alloc_amount   bigint;
BEGIN
  -- Auth
  IF v_caller_id IS NOT NULL AND NOT (
    public.has_role(v_caller_id, 'admin') OR
    public.has_role(v_caller_id, 'staff')
  ) THEN
    RAISE EXCEPTION 'Permission denied: admin or staff role required';
  END IF;

  -- Basic validation
  IF p_amount_pence <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  IF p_idempotency_key IS NULL OR trim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'idempotency_key is required';
  END IF;

  -- Idempotency check
  SELECT id INTO v_payment_id
  FROM public.supplier_payments
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object('payment_id', v_payment_id, 'duplicate', true);
  END IF;

  -- Supplier must exist
  IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE id = p_supplier_id) THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;

  -- PO must belong to this supplier (if specified)
  IF p_purchase_order_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.purchase_orders
      WHERE id = p_purchase_order_id
        AND supplier_id = p_supplier_id
    ) THEN
      RAISE EXCEPTION 'Purchase order does not belong to selected supplier';
    END IF;
  END IF;

  -- Overpayment protection
  SELECT COALESCE(balance_pence, 0)
  INTO v_balance_pence
  FROM public.v_supplier_balances
  WHERE id = p_supplier_id;

  v_balance_pence := COALESCE(v_balance_pence, 0);

  IF p_amount_pence > v_balance_pence THEN
    RAISE EXCEPTION
      'Payment of £%.2f exceeds outstanding supplier balance of £%.2f',
      (p_amount_pence::numeric / 100),
      (v_balance_pence::numeric / 100);
  END IF;

  -- Insert payment
  INSERT INTO public.supplier_payments (
    supplier_id, purchase_order_id, amount_pence, method,
    reference, notes, payment_date, idempotency_key,
    is_void, created_by
  ) VALUES (
    p_supplier_id, p_purchase_order_id, p_amount_pence, p_method::public.payment_method_type,
    p_reference, p_notes, p_payment_date, p_idempotency_key,
    false, v_caller_id
  )
  RETURNING id INTO v_payment_id;

  -- Allocations (always written)
  v_remaining := p_amount_pence;

  IF p_purchase_order_id IS NOT NULL THEN
    -- Allocate to GRNs of specified PO, oldest first (FIFO)
    FOR v_grn IN
      SELECT grn_id, outstanding_pence
      FROM public.v_grn_outstanding
      WHERE supplier_id    = p_supplier_id
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
    -- FIFO across ALL outstanding GRNs for this supplier, oldest first
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

  -- Return result with new balance
  SELECT COALESCE(balance_pence, 0)
  INTO v_balance_pence
  FROM public.v_supplier_balances
  WHERE id = p_supplier_id;

  RETURN jsonb_build_object(
    'payment_id',        v_payment_id,
    'duplicate',         false,
    'new_balance_pence', COALESCE(v_balance_pence, 0)
  );
END;
$$;


-- ------------------------------------------------------------
-- 4b. void_supplier_payment()
--     Admin only. Soft-void with mandatory reason.
--     Allocation rows remain for audit (excluded via is_void join).
-- ------------------------------------------------------------
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
  v_caller_id   uuid := auth.uid();
  v_supplier_id uuid;
BEGIN
  -- Admin only
  IF v_caller_id IS NOT NULL AND NOT public.has_role(v_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Permission denied: admin role required to void payments';
  END IF;

  IF p_void_reason IS NULL OR trim(p_void_reason) = '' THEN
    RAISE EXCEPTION 'A void reason is required';
  END IF;

  SELECT supplier_id INTO v_supplier_id
  FROM public.supplier_payments
  WHERE id = p_payment_id AND is_void = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found or already voided';
  END IF;

  UPDATE public.supplier_payments
  SET
    is_void     = true,
    void_reason = p_void_reason,
    voided_by   = v_caller_id,
    voided_at   = now()
  WHERE id = p_payment_id;

  RETURN jsonb_build_object(
    'voided',            true,
    'payment_id',        p_payment_id,
    'new_balance_pence', COALESCE(
      (SELECT balance_pence FROM public.v_supplier_balances WHERE id = v_supplier_id),
      0
    )
  );
END;
$$;


-- ============================================================
-- VERIFICATION QUERIES (run these after to confirm success)
-- ============================================================

-- Check new columns exist on supplier_payments:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'supplier_payments'
-- ORDER BY ordinal_position;

-- Check allocations table exists:
-- SELECT COUNT(*) FROM public.supplier_payment_allocations;

-- Check all 4 views work:
-- SELECT * FROM public.v_supplier_ledger   LIMIT 5;
-- SELECT * FROM public.v_grn_outstanding   LIMIT 5;
-- SELECT * FROM public.v_supplier_balances LIMIT 5;
-- SELECT * FROM public.v_supplier_aging    LIMIT 5;

-- Test RPC signature:
-- SELECT proname, pronargs FROM pg_proc
-- WHERE proname IN ('record_supplier_payment','void_supplier_payment');
