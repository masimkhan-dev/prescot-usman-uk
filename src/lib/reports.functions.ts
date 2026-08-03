import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const reportRangeSchema = z.object({
  from: z.string().optional().nullable(), // YYYY-MM-DD
  to: z.string().optional().nullable(), // YYYY-MM-DD
});

/**
 * getReports — full P&L from authoritative views.
 * NOTE: This is a business operations summary, NOT a statutory P&L or general ledger.
 */
export const getReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => reportRangeSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const now = new Date();
    const todayLondon = now.toLocaleDateString("sv-SE", { timeZone: "Europe/London" });
    const monthStart = `${todayLondon.slice(0, 7)}-01`;

    const fromDate = data.from ?? monthStart;
    const toDate = data.to ?? todayLondon;

    // Daily sales summary for range
    const { data: dailySales } = await context.supabase
      .from("v_daily_sales_summary")
      .select("*")
      .gte("trade_date", fromDate)
      .lte("trade_date", toDate)
      .order("trade_date", { ascending: true });

    // COGS for range
    const { data: cogsRows } = await context.supabase
      .from("v_cogs_by_period")
      .select("*")
      .gte("trade_date", fromDate)
      .lte("trade_date", toDate);

    // Repair revenue for range
    const { data: repairPayments } = await context.supabase
      .from("repair_payments")
      .select("amount_pence, method, created_at")
      .gte("created_at", `${fromDate}T00:00:00+00:00`)
      .lte("created_at", `${toDate}T23:59:59+00:00`);

    // Expenses for range (non-void)
    const { data: expenses } = await context.supabase
      .from("expenses")
      .select("amount_pence, category, expense_date")
      .gte("expense_date", fromDate)
      .lte("expense_date", toDate)
      .eq("is_void", false);

    // Supplier balances
    const { data: supplierBalances } = await context.supabase
      .from("v_supplier_balances")
      .select("*");

    // Stock valuation
    const { data: stockVal } = await context.supabase
      .from("v_stock_valuation")
      .select(
        "stock_value_at_cost_pence, stock_value_at_retail_pence, potential_gross_profit_pence",
      );

    // Aggregate totals
    const grossRevenuePence = (dailySales ?? []).reduce((s, r) => s + (r.net_sales_pence ?? 0), 0);
    const refundsPence = (dailySales ?? []).reduce((s, r) => s + (r.refunds_pence ?? 0), 0);
    const netSalesPence = grossRevenuePence - refundsPence;
    const cogsPence = (cogsRows ?? []).reduce((s, r) => s + (r.cogs_pence ?? 0), 0);
    const grossProfitPence = netSalesPence - cogsPence;
    const repairRevenuePence = (repairPayments ?? []).reduce(
      (s, r) => s + (r.amount_pence ?? 0),
      0,
    );
    const expensesTotalPence = (expenses ?? []).reduce((s, r) => s + (r.amount_pence ?? 0), 0);
    const netProfitPence = grossProfitPence + repairRevenuePence - expensesTotalPence;

    const cashPence = (dailySales ?? []).reduce((s, r) => s + (r.cash_pence ?? 0), 0);
    const cardPence = (dailySales ?? []).reduce((s, r) => s + (r.card_pence ?? 0), 0);
    const bankPence = (dailySales ?? []).reduce((s, r) => s + (r.bank_pence ?? 0), 0);

    const stockValueCostPence = (stockVal ?? []).reduce(
      (s, r) => s + (r.stock_value_at_cost_pence ?? 0),
      0,
    );
    const stockValueRetailPence = (stockVal ?? []).reduce(
      (s, r) => s + (r.stock_value_at_retail_pence ?? 0),
      0,
    );

    return {
      fromDate,
      toDate,
      // P&L
      grossRevenuePence,
      refundsPence,
      netSalesPence,
      cogsPence,
      grossProfitPence,
      repairRevenuePence,
      expensesTotalPence,
      netProfitPence,
      // Payment breakdown
      cashPence,
      cardPence,
      bankPence,
      // Chart data (daily)
      salesByDay: (dailySales ?? []).map((r) => ({
        date: r.trade_date,
        net_sales_pence: r.net_sales_pence ?? 0,
        refunds_pence: r.refunds_pence ?? 0,
        sale_count: r.sale_count ?? 0,
      })),
      // Supporting data
      supplierBalances: supplierBalances ?? [],
      stockValueCostPence,
      stockValueRetailPence,
      expenseBreakdown: expenses ?? [],
    };
  });
