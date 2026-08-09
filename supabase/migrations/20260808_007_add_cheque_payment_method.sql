-- =============================================================================
-- MIGRATION 007: add_cheque_payment_method
-- Prescot Mobiles ERP
--
-- BUG-002 fix: The supplier ledger UI allows "cheque" as a payment method,
-- and the Zod schema in suppliers.functions.ts permits it. However the
-- underlying Postgres enum payment_method_type did not include it,
-- meaning any cheque payment would be rejected at the DB level with a cast
-- error before the RPC could even run.
--
-- Safe to re-run: ADD VALUE IF NOT EXISTS is idempotent in PG >= 9.6.
-- =============================================================================

ALTER TYPE public.payment_method_type ADD VALUE IF NOT EXISTS 'cheque';
