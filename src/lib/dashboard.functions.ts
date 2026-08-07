import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** getDashboardSummary — all metrics from authoritative DB sources, no mocks */
export const getDashboardSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date();
    // UK trading day boundaries (Europe/London) via ISO offset
    const todayLondon = now.toLocaleDateString("sv-SE", { timeZone: "Europe/London" });
    // Use timestamptz comparison: today in London == today in UTC ±1hr depending on BST
    const dayStart = `${todayLondon}T00:00:00`;
    const dayEnd = `${todayLondon}T23:59:59`;

    // Today's sales (gross) from the daily summary view — exclude voided
    const { data: salesView } = await context.supabase
      .from("v_daily_sales_summary")
      .select("net_sales_pence, refunds_pence, cash_pence, card_pence, bank_pence, sale_count")
      .eq("trade_date", todayLondon)
      .maybeSingle();

    // Today's repair revenue (paid repair payments today)
    const { data: repairPayments } = await context.supabase
      .from("repair_payments")
      .select("amount_pence")
      .gte("created_at", `${dayStart}+00:00`)
      .lte("created_at", `${dayEnd}+00:00`);

    // Pending repairs
    const { count: pendingRepairs } = await context.supabase
      .from("repair_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    // Low stock — uses per-product threshold (v_low_stock_products view)
    const { count: lowStock } = await context.supabase
      .from("v_low_stock_products")
      .select("id", { count: "exact", head: true });

    // Total stock valuation: sum(stock_quantity * cost_price_pence)
    const { data: activeProducts } = await context.supabase
      .from("products")
      .select("stock_quantity, cost_price_pence, avg_cost_pence")
      .eq("status", "active");

    const totalStockValuePence = (activeProducts ?? []).reduce(
      (sum, p) => sum + (p.stock_quantity ?? 0) * (p.cost_price_pence ?? p.avg_cost_pence ?? 0),
      0,
    );

    // Today's expenses (non-void)
    const { data: todayExpenses } = await context.supabase
      .from("expenses")
      .select("amount_pence")
      .eq("expense_date", todayLondon)
      .eq("is_void", false);

    // Recent 5 sales
    const { data: recentSales } = await context.supabase
      .from("sales")
      .select("id, invoice_number, total_pence, created_at, customers(name)")
      .gte("created_at", `${dayStart}+00:00`)
      .lte("created_at", `${dayEnd}+00:00`)
      .order("created_at", { ascending: false })
      .limit(5);

    const repairRevenuePence = (repairPayments ?? []).reduce(
      (sum, r) => sum + (r.amount_pence ?? 0),
      0,
    );
    const expensesTotalPence = (todayExpenses ?? []).reduce(
      (sum, e) => sum + (e.amount_pence ?? 0),
      0,
    );

    return {
      todaySalesPence: salesView?.net_sales_pence ?? 0,
      todayRefundsPence: salesView?.refunds_pence ?? 0,
      todayRepairRevenuePence: repairRevenuePence,
      todayCashPence: salesView?.cash_pence ?? 0,
      todayCardPence: salesView?.card_pence ?? 0,
      todayBankPence: salesView?.bank_pence ?? 0,
      todaySaleCount: salesView?.sale_count ?? 0,
      todayExpensesPence: expensesTotalPence,
      pendingRepairs: pendingRepairs ?? 0,
      lowStock: lowStock ?? 0,
      totalStockValuePence,
      recentSales: recentSales ?? [],
    };
  });
