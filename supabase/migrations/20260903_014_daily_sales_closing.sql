-- =============================================================================
-- MIGRATION 014: daily_sales_closing
-- Authoritative daily turnover tracking for Prescot Mobiles & Computer Services
-- Allows staff/manager to record end-of-day closing: Cash, Card, Bank Transfer.
-- Total Sales is automatically calculated: Total = Cash + Card + Bank.
-- Daily closing records cannot be hard-deleted; they can only be VOIDED with an audit trail.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.daily_sales (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date   date NOT NULL DEFAULT CURRENT_DATE,
  staff_name   text NOT NULL,
  cash_amount  numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (cash_amount >= 0),
  card_amount  numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (card_amount >= 0),
  bank_amount  numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (bank_amount >= 0),
  total_amount numeric(12, 2) GENERATED ALWAYS AS (cash_amount + card_amount + bank_amount) STORED,
  notes        text,
  is_void      boolean NOT NULL DEFAULT false,
  void_reason  text,
  void_at      timestamptz,
  void_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by   uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Ensure void audit columns exist if table was created in an earlier migration run
ALTER TABLE public.daily_sales ADD COLUMN IF NOT EXISTS is_void boolean NOT NULL DEFAULT false;
ALTER TABLE public.daily_sales ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.daily_sales ADD COLUMN IF NOT EXISTS void_at timestamptz;
ALTER TABLE public.daily_sales ADD COLUMN IF NOT EXISTS void_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Drop legacy hard unique constraint if exists, replace with active-only unique index so
-- voiding an entry allows staff to record the corrected closing for that day
ALTER TABLE public.daily_sales DROP CONSTRAINT IF EXISTS daily_sales_unique_date;
DROP INDEX IF EXISTS idx_daily_sales_unique_active_date;
CREATE UNIQUE INDEX idx_daily_sales_unique_active_date ON public.daily_sales(entry_date) WHERE is_void = false;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_daily_sales_date
  ON public.daily_sales(entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_sales_created
  ON public.daily_sales(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_sales_void
  ON public.daily_sales(is_void);

-- =============================================================================
-- TRIGGER (Reuses Prescot's existing generic update_updated_at function)
-- =============================================================================

DROP TRIGGER IF EXISTS daily_sales_updated_at ON public.daily_sales;

CREATE TRIGGER daily_sales_updated_at
  BEFORE UPDATE ON public.daily_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- RLS & GRANTS
-- =============================================================================

ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.daily_sales TO authenticated;
GRANT ALL ON public.daily_sales TO service_role;

-- Remove policies first so migration can safely be re-run idempotently
DROP POLICY IF EXISTS "daily_sales_read"
  ON public.daily_sales;

DROP POLICY IF EXISTS "daily_sales_insert"
  ON public.daily_sales;

DROP POLICY IF EXISTS "daily_sales_update"
  ON public.daily_sales;

DROP POLICY IF EXISTS "daily_sales_delete"
  ON public.daily_sales;

-- Staff/Admin/Technician can view daily sales
CREATE POLICY "daily_sales_read"
  ON public.daily_sales FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
    OR public.has_role(auth.uid(), 'technician')
  );

-- Staff/Admin can create daily sales closing
CREATE POLICY "daily_sales_insert"
  ON public.daily_sales FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  );

-- Staff/Admin can edit or void daily sales entries
CREATE POLICY "daily_sales_update"
  ON public.daily_sales FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  );
