import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getOpenShift = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("shifts")
      .select("*")
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

export const listShifts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("shifts")
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return data || [];
  });

export const openShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ opening_float: z.number().min(0) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("shifts")
      .select("id")
      .eq("status", "open")
      .maybeSingle();
    if (existing) throw new Error("A shift is already open. Close it first.");

    const { data: shift, error } = await context.supabase
      .from("shifts")
      .insert({ opening_float: data.opening_float, opened_by: context.userId, status: "open" })
      .select()
      .single();
    if (error) throw error;
    return shift;
  });

/** Live totals for the currently open shift (nothing persisted). */
export const getShiftSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ shift_id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: shift, error } = await context.supabase
      .from("shifts")
      .select("*")
      .eq("id", data.shift_id)
      .single();
    if (error) throw error;

    const since = shift.opened_at;
    const until = shift.closed_at || new Date().toISOString();

    const { data: sales } = await context.supabase
      .from("sales")
      .select("total, payment_method")
      .gte("created_at", since)
      .lte("created_at", until);
    const { data: returns } = await context.supabase
      .from("sale_returns")
      .select("total, refund_method")
      .gte("created_at", since)
      .lte("created_at", until);
    const { data: expenses } = await context.supabase
      .from("expenses")
      .select("amount")
      .gte("created_at", since)
      .lte("created_at", until);
    const { data: repairs } = await context.supabase
      .from("repair_tickets")
      .select("price, labour_cost, paid, updated_at")
      .eq("paid", true)
      .gte("updated_at", since)
      .lte("updated_at", until);

    const by = (m: string) =>
      (sales || []).filter((s) => s.payment_method === m).reduce((a, s) => a + Number(s.total || 0), 0);

    const cashSales = by("cash");
    const cardSales = by("card");
    const bankSales = by("bank_transfer");
    const cashRefunds = (returns || [])
      .filter((r) => r.refund_method === "cash")
      .reduce((a, r) => a + Number(r.total || 0), 0);
    const refundsTotal = (returns || []).reduce((a, r) => a + Number(r.total || 0), 0);
    const expensesTotal = (expenses || []).reduce((a, e) => a + Number(e.amount || 0), 0);
    const repairsCollected = (repairs || []).reduce((a, r) => a + Number(r.price || 0), 0);

    return {
      shift,
      salesCount: (sales || []).length,
      cashSales,
      cardSales,
      bankSales,
      refundsTotal,
      cashRefunds,
      expensesTotal,
      repairsCollected,
      expectedCash: Number(shift.opening_float || 0) + cashSales - cashRefunds - expensesTotal,
    };
  });

export const closeShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      shift_id: z.string(),
      counted_cash: z.number(),
      notes: z.string().optional().nullable(),
      cash_sales: z.number(),
      card_sales: z.number(),
      bank_sales: z.number(),
      refunds_total: z.number(),
      expenses_total: z.number(),
      sales_count: z.number().int(),
      expected_cash: z.number(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: shift, error } = await context.supabase
      .from("shifts")
      .update({
        status: "closed",
        closed_by: context.userId,
        closed_at: new Date().toISOString(),
        counted_cash: data.counted_cash,
        expected_cash: data.expected_cash,
        difference: data.counted_cash - data.expected_cash,
        cash_sales: data.cash_sales,
        card_sales: data.card_sales,
        bank_sales: data.bank_sales,
        refunds_total: data.refunds_total,
        expenses_total: data.expenses_total,
        sales_count: data.sales_count,
        notes: data.notes,
      })
      .eq("id", data.shift_id)
      .select()
      .single();
    if (error) throw error;
    return shift;
  });
