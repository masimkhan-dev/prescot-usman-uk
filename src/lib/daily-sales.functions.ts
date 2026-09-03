import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const dailySaleSchema = z.object({
  id: z.string().uuid().optional(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staff_name: z.string().min(1, "Staff name is required"),
  cash_amount: z.number().nonnegative("Cash amount must be 0 or greater"),
  card_amount: z.number().nonnegative("Card amount must be 0 or greater"),
  bank_amount: z.number().nonnegative("Bank transfer amount must be 0 or greater"),
  notes: z.string().optional().nullable(),
});

/**
 * listDailySales — list daily sales closing entries with date range, pagination,
 * and associated daily expense totals
 */
export const listDailySales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z
      .object({
        from: z.string().optional().nullable(),
        to: z.string().optional().nullable(),
        page: z.coerce.number().int().nonnegative().default(0),
        limit: z.coerce.number().int().positive().max(100).default(30),
      })
      .parse(input?.data ?? input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("daily_sales")
      .select("*", { count: "exact" })
      .order("entry_date", { ascending: false })
      .range(data.page * data.limit, (data.page + 1) * data.limit - 1);

    if (data.from) q = q.gte("entry_date", data.from);
    if (data.to) q = q.lte("entry_date", data.to);

    const { data: rows, count, error } = await q;
    if (error) throw error;

    // Fetch non-void expenses for these dates to show expenses & net in history
    const dates = (rows ?? []).map((r) => r.entry_date);
    let expensesByDate: Record<string, number> = {};
    if (dates.length > 0) {
      const { data: expenses } = await context.supabase
        .from("expenses")
        .select("expense_date, amount_pence")
        .in("expense_date", dates)
        .eq("is_void", false);

      if (expenses) {
        expensesByDate = expenses.reduce((acc: Record<string, number>, exp) => {
          acc[exp.expense_date] = (acc[exp.expense_date] || 0) + exp.amount_pence;
          return acc;
        }, {});
      }
    }

    const enrichedRows = (rows ?? []).map((r) => {
      const expPence = expensesByDate[r.entry_date] || 0;
      const totalAmount = Number(r.total_amount || 0);
      const expAmount = expPence / 100;
      return {
        ...r,
        expenses_amount: expAmount,
        net_amount: r.is_void ? 0 : Math.round((totalAmount - expAmount) * 100) / 100,
      };
    });

    return { rows: enrichedRows, total: count ?? 0 };
  });

/**
 * getDailySaleByDate — retrieve a specific date's active closing entry
 */
export const getDailySaleByDate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input?.data ?? input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("daily_sales")
      .select("*")
      .eq("entry_date", data.date)
      .eq("is_void", false)
      .maybeSingle();

    if (error) throw error;
    return row ?? null;
  });

/**
 * saveDailySale — create or update a daily sales closing entry (upsert on entry_date)
 */
export const saveDailySale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => dailySaleSchema.parse(input?.data ?? input))
  .handler(async ({ data, context }) => {
    const cash = Math.round(data.cash_amount * 100) / 100;
    const card = Math.round(data.card_amount * 100) / 100;
    const bank = Math.round(data.bank_amount * 100) / 100;

    const payload: Record<string, any> = {
      entry_date: data.entry_date,
      staff_name: data.staff_name.trim(),
      cash_amount: cash,
      card_amount: card,
      bank_amount: bank,
      notes: data.notes?.trim() || null,
      created_by: context.userId,
      is_void: false,
    };

    if (data.id) {
      payload.id = data.id;
    }

    const { data: saved, error } = await context.supabase
      .from("daily_sales")
      .upsert(payload, { onConflict: "entry_date" })
      .select()
      .single();

    if (error) throw error;
    return saved;
  });

/**
 * voidDailySale — soft-delete/void a daily closing entry with an audit reason (cannot be hard-deleted)
 */
export const voidDailySale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z
      .object({
        id: z.string().uuid(),
        void_reason: z.string().min(1, "Please provide a reason for voiding this daily closing"),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("daily_sales")
      .update({
        is_void: true,
        void_reason: data.void_reason.trim(),
        void_at: new Date().toISOString(),
        void_by: context.userId,
      })
      .eq("id", data.id)
      .eq("is_void", false)
      .select()
      .single();

    if (error) throw error;
    return { ok: true, data: updated };
  });

/**
 * listDailyExpensesByDate — list itemized expenses for a specific date (e.g. Repair Parts, Wages, etc.)
 */
export const listDailyExpensesByDate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input?.data ?? input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("expenses")
      .select("*")
      .eq("expense_date", data.date)
      .eq("is_void", false)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return rows ?? [];
  });

/**
 * addDailyExpense — add an expense during daily closing (parts cost, wages/salary, supplies, etc.)
 */
export const addDailyExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z
      .object({
        expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        category: z.string().min(1, "Category is required"),
        description: z.string().min(1, "Description is required"),
        amount: z.number().positive("Amount must be greater than £0.00"),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const amountPence = Math.round(data.amount * 100);
    const { data: inserted, error } = await context.supabase
      .from("expenses")
      .insert({
        expense_date: data.expense_date,
        category: data.category.trim(),
        description: data.description.trim(),
        amount_pence: amountPence,
        created_by: context.userId,
      })
      .select()
      .single();

    if (error) throw error;
    return inserted;
  });

/**
 * deleteDailyExpense — remove an expense recorded for the day
 */
export const deleteDailyExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z.object({ id: z.string().uuid() }).parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("expenses")
      .delete()
      .eq("id", data.id);

    if (error) throw error;
    return { ok: true };
  });
