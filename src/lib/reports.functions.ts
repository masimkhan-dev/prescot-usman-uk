import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const startOfToday = now.toISOString().split("T")[0] + "T00:00:00Z";
    const endOfToday = now.toISOString().split("T")[0] + "T23:59:59Z";

    const { data: monthSales } = await context.supabase
      .from("sales")
      .select("total, created_at")
      .gte("created_at", startOfMonth)
      .eq("status", "completed");

    const { data: monthExpenses } = await context.supabase
      .from("expenses")
      .select("amount, expense_date")
      .gte("expense_date", startOfMonth);

    const { data: todaySales } = await context.supabase
      .from("sales")
      .select("total")
      .gte("created_at", startOfToday)
      .lte("created_at", endOfToday)
      .eq("status", "completed");

    const { data: todayExpenses } = await context.supabase
      .from("expenses")
      .select("amount")
      .eq("expense_date", startOfMonth);

    const totalMonthSales = monthSales?.reduce((a, b) => a + (b.total || 0), 0) || 0;
    const totalMonthExpenses = monthExpenses?.reduce((a, b) => a + (b.amount || 0), 0) || 0;
    const totalTodaySales = todaySales?.reduce((a, b) => a + (b.total || 0), 0) || 0;
    const totalTodayExpenses = todayExpenses?.reduce((a, b) => a + (b.amount || 0), 0) || 0;

    const salesByDay: Record<string, number> = {};
    for (const s of monthSales || []) {
      const day = s.created_at.split("T")[0];
      salesByDay[day] = (salesByDay[day] || 0) + (s.total || 0);
    }

    return {
      totalMonthSales,
      totalMonthExpenses,
      profitMonth: totalMonthSales - totalMonthExpenses,
      totalTodaySales,
      totalTodayExpenses,
      profitToday: totalTodaySales - totalTodayExpenses,
      salesByDay: Object.entries(salesByDay).map(([date, total]) => ({ date, total })),
    };
  });
