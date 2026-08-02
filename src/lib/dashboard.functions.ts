import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().split("T")[0];
    const startOfDay = `${today}T00:00:00Z`;
    const endOfDay = `${today}T23:59:59Z`;

    const { data: todaySales } = await context.supabase
      .from("sales")
      .select("total")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .eq("status", "completed");

    const { count: pendingRepairs } = await context.supabase
      .from("repair_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: lowStock } = await context.supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .lte("stock_quantity", 5)
      .eq("status", "active");

    const { data: todayExpenses } = await context.supabase
      .from("expenses")
      .select("amount")
      .eq("expense_date", today);

    const { data: recentSales } = await context.supabase
      .from("sales")
      .select("id, total, payment_method, created_at, customers(name)")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      todaySales: todaySales?.reduce((acc, s) => acc + (s.total || 0), 0) || 0,
      pendingRepairs: pendingRepairs || 0,
      lowStock: lowStock || 0,
      todayExpenses: todayExpenses?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0,
      recentSales: recentSales || [],
    };
  });
