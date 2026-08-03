-- =============================================================================
-- MIGRATION 003: reporting_views
-- All views use SECURITY INVOKER so RLS applies automatically
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Daily sales summary (UK timezone)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_daily_sales_summary
WITH (security_invoker = true)
AS
SELECT
  (s.created_at AT TIME ZONE 'Europe/London')::date                          AS trade_date,
  COUNT(DISTINCT s.id)                                                        AS sale_count,
  COALESCE(SUM(s.subtotal_pence), 0)                                          AS gross_sales_pence,
  COALESCE(SUM(s.discount_pence), 0)                                          AS discount_pence,
  COALESCE(SUM(s.total_pence), 0)                                             AS net_sales_pence,
  COALESCE(SUM(
    CASE WHEN s.status NOT IN ('refunded','voided') THEN s.total_pence ELSE 0 END
  ), 0)                                                                       AS revenue_pence,
  COALESCE(SUM(sr_total.refunded_pence), 0)                                   AS refunds_pence,
  COALESCE(SUM(
    CASE WHEN p.method = 'cash' THEN p.amount_pence ELSE 0 END
  ), 0)                                                                       AS cash_pence,
  COALESCE(SUM(
    CASE WHEN p.method = 'card' THEN p.amount_pence ELSE 0 END
  ), 0)                                                                       AS card_pence,
  COALESCE(SUM(
    CASE WHEN p.method = 'bank_transfer' THEN p.amount_pence ELSE 0 END
  ), 0)                                                                       AS bank_pence
FROM public.sales s
LEFT JOIN public.payments p ON p.ref_id = s.id AND p.ref_type = 'sale'
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(total_pence), 0) AS refunded_pence
  FROM public.sale_returns
  WHERE sale_id = s.id
) sr_total ON true
GROUP BY trade_date
ORDER BY trade_date DESC;

-- ---------------------------------------------------------------------------
-- 2. COGS by period
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_cogs_by_period
WITH (security_invoker = true)
AS
SELECT
  (s.created_at AT TIME ZONE 'Europe/London')::date AS trade_date,
  SUM(si.quantity * si.cost_price_pence)             AS cogs_pence,
  SUM(si.line_total_pence)                           AS revenue_pence,
  SUM(si.line_total_pence) - SUM(si.quantity * si.cost_price_pence) AS gross_profit_pence
FROM public.sale_items si
JOIN public.sales s ON s.id = si.sale_id
WHERE s.status NOT IN ('voided')
GROUP BY trade_date
ORDER BY trade_date DESC;

-- ---------------------------------------------------------------------------
-- 3. Repair revenue
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_repair_revenue
WITH (security_invoker = true)
AS
SELECT
  r.id                                                                AS repair_id,
  r.rep_number,
  r.status,
  r.total_price_pence,
  r.amount_paid_pence,
  r.total_price_pence - r.amount_paid_pence                          AS outstanding_pence,
  r.warranty_until,
  r.warranty_until IS NOT NULL AND r.warranty_until >= CURRENT_DATE  AS is_in_warranty,
  (r.created_at AT TIME ZONE 'Europe/London')::date                  AS created_date,
  c.name                                                              AS customer_name,
  c.phone                                                             AS customer_phone,
  COALESCE(rp_cost.parts_cost_pence, 0)                              AS parts_cost_pence,
  r.labour_price_pence,
  r.total_price_pence - COALESCE(rp_cost.parts_cost_pence, 0) - r.labour_price_pence
                                                                      AS margin_pence
FROM public.repair_tickets r
LEFT JOIN public.customers c ON c.id = r.customer_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(quantity * unit_cost_pence), 0) AS parts_cost_pence
  FROM public.repair_parts
  WHERE repair_id = r.id AND is_returned = false
) rp_cost ON true;

-- ---------------------------------------------------------------------------
-- 4. Stock valuation (current stock × moving-average cost)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_stock_valuation
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.name,
  p.category,
  p.sku,
  p.stock_quantity,
  p.avg_cost_pence,
  p.sale_price_pence,
  p.stock_quantity * p.avg_cost_pence                         AS stock_value_at_cost_pence,
  p.stock_quantity * p.sale_price_pence                       AS stock_value_at_retail_pence,
  p.stock_quantity * (p.sale_price_pence - p.avg_cost_pence)  AS potential_gross_profit_pence,
  p.status
FROM public.products p
WHERE p.status = 'active'
ORDER BY (p.stock_quantity * p.avg_cost_pence) DESC;

-- ---------------------------------------------------------------------------
-- 5. Low stock alert (per-product threshold)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_low_stock_products
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.name,
  p.category,
  p.sku,
  p.barcode,
  p.stock_quantity,
  p.low_stock_threshold,
  p.low_stock_threshold - p.stock_quantity AS units_below_threshold,
  p.avg_cost_pence,
  p.sale_price_pence
FROM public.products p
WHERE p.status = 'active'
  AND p.stock_quantity <= p.low_stock_threshold
ORDER BY p.stock_quantity ASC;

-- ---------------------------------------------------------------------------
-- 6. Supplier balances (PO totals received minus payments made)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_supplier_balances
WITH (security_invoker = true)
AS
SELECT
  s.id                                                          AS supplier_id,
  s.name,
  s.phone,
  s.email,
  s.balance_pence,
  COALESCE(po_totals.total_ordered_pence, 0)                   AS total_ordered_pence,
  COALESCE(sp_totals.total_paid_pence, 0)                      AS total_paid_pence,
  s.balance_pence > 0                                          AS has_outstanding_balance
FROM public.suppliers s
LEFT JOIN LATERAL (
  SELECT SUM(total_pence) AS total_ordered_pence
  FROM public.purchase_orders
  WHERE supplier_id = s.id AND status IN ('ordered','partial','received')
) po_totals ON true
LEFT JOIN LATERAL (
  SELECT SUM(amount_pence) AS total_paid_pence
  FROM public.supplier_payments
  WHERE supplier_id = s.id
) sp_totals ON true
ORDER BY s.balance_pence DESC;

-- ---------------------------------------------------------------------------
-- 7. Shift reconciliation (server-computed totals from actual records)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_shift_reconciliation
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
  -- Recomputed live from actual records
  COALESCE(sales_agg.cash_sales_pence, 0)                         AS cash_sales_pence,
  COALESCE(sales_agg.card_sales_pence, 0)                         AS card_sales_pence,
  COALESCE(sales_agg.bank_sales_pence, 0)                         AS bank_sales_pence,
  COALESCE(sales_agg.sale_count, 0)                               AS sale_count,
  COALESCE(repair_agg.repair_cash_pence, 0)                       AS repair_cash_pence,
  COALESCE(refund_agg.cash_refunds_pence, 0)                      AS cash_refunds_pence,
  COALESCE(refund_agg.total_refunds_pence, 0)                     AS total_refunds_pence,
  COALESCE(exp_agg.expenses_pence, 0)                             AS expenses_pence,
  (
    sh.opening_float_pence +
    COALESCE(sales_agg.cash_sales_pence, 0) +
    COALESCE(repair_agg.repair_cash_pence, 0) -
    COALESCE(refund_agg.cash_refunds_pence, 0) -
    COALESCE(exp_agg.expenses_pence, 0)
  )                                                               AS computed_expected_cash_pence,
  p.full_name                                                     AS opened_by_name
FROM public.shifts sh
LEFT JOIN public.profiles p ON p.user_id = sh.opened_by
LEFT JOIN LATERAL (
  SELECT
    SUM(CASE WHEN py.method = 'cash' THEN py.amount_pence ELSE 0 END) AS cash_sales_pence,
    SUM(CASE WHEN py.method = 'card' THEN py.amount_pence ELSE 0 END) AS card_sales_pence,
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
ORDER BY sh.opened_at DESC;

-- ---------------------------------------------------------------------------
-- 8. Monthly P&L summary
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_monthly_pnl
WITH (security_invoker = true)
AS
WITH monthly_sales AS (
  SELECT
    DATE_TRUNC('month', created_at AT TIME ZONE 'Europe/London') AS month,
    SUM(total_pence) AS gross_revenue_pence
  FROM public.sales
  WHERE status NOT IN ('voided')
  GROUP BY 1
),
monthly_cogs AS (
  SELECT
    DATE_TRUNC('month', s.created_at AT TIME ZONE 'Europe/London') AS month,
    SUM(si.quantity * si.cost_price_pence) AS cogs_pence
  FROM public.sale_items si
  JOIN public.sales s ON s.id = si.sale_id
  WHERE s.status NOT IN ('voided')
  GROUP BY 1
),
monthly_returns AS (
  SELECT
    DATE_TRUNC('month', sr.created_at AT TIME ZONE 'Europe/London') AS month,
    SUM(sr.total_pence) AS returns_pence
  FROM public.sale_returns sr
  GROUP BY 1
),
monthly_repairs AS (
  SELECT
    DATE_TRUNC('month', rp.created_at AT TIME ZONE 'Europe/London') AS month,
    SUM(rp.amount_pence) AS repair_revenue_pence
  FROM public.repair_payments rp
  GROUP BY 1
),
monthly_expenses AS (
  SELECT
    DATE_TRUNC('month', created_at AT TIME ZONE 'Europe/London') AS month,
    SUM(amount_pence) AS expenses_pence
  FROM public.expenses
  WHERE is_void = false
  GROUP BY 1
)
SELECT
  COALESCE(ms.month, mc.month, mrep.month, mexp.month, mret.month) AS month,
  COALESCE(ms.gross_revenue_pence, 0)                               AS gross_revenue_pence,
  COALESCE(mret.returns_pence, 0)                                   AS returns_pence,
  COALESCE(ms.gross_revenue_pence, 0) - COALESCE(mret.returns_pence, 0) AS net_sales_pence,
  COALESCE(mc.cogs_pence, 0)                                        AS cogs_pence,
  COALESCE(ms.gross_revenue_pence, 0) - COALESCE(mret.returns_pence, 0)
    - COALESCE(mc.cogs_pence, 0)                                    AS gross_profit_pence,
  COALESCE(mrep.repair_revenue_pence, 0)                            AS repair_revenue_pence,
  COALESCE(mexp.expenses_pence, 0)                                  AS expenses_pence,
  COALESCE(ms.gross_revenue_pence, 0) - COALESCE(mret.returns_pence, 0)
    - COALESCE(mc.cogs_pence, 0) + COALESCE(mrep.repair_revenue_pence, 0)
    - COALESCE(mexp.expenses_pence, 0)                              AS net_profit_pence
FROM monthly_sales ms
FULL OUTER JOIN monthly_cogs mc ON mc.month = ms.month
FULL OUTER JOIN monthly_returns mret ON mret.month = ms.month
FULL OUTER JOIN monthly_repairs mrep ON mrep.month = ms.month
FULL OUTER JOIN monthly_expenses mexp ON mexp.month = ms.month
ORDER BY month DESC;

-- Grant SELECT on all views to authenticated
GRANT SELECT ON public.v_daily_sales_summary   TO authenticated;
GRANT SELECT ON public.v_cogs_by_period        TO authenticated;
GRANT SELECT ON public.v_repair_revenue        TO authenticated;
GRANT SELECT ON public.v_stock_valuation       TO authenticated;
GRANT SELECT ON public.v_low_stock_products    TO authenticated;
GRANT SELECT ON public.v_supplier_balances     TO authenticated;
GRANT SELECT ON public.v_shift_reconciliation  TO authenticated;
GRANT SELECT ON public.v_monthly_pnl           TO authenticated;
