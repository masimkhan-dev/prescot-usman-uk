import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const expenseSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  amount_pence: z.number().int().positive(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift_id: z.string().uuid().optional().nullable(),
});

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z
      .object({
        from: z.string().optional().nullable(),
        to: z.string().optional().nullable(),
        include_void: z.boolean().default(false),
        page: z.coerce.number().int().nonnegative().default(0),
        limit: z.coerce.number().int().positive().max(100).default(25),
      })
      .parse(input?.data ?? input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("expenses")
      .select("*", { count: "exact" })
      .order("expense_date", { ascending: false })
      .range(data.page * data.limit, (data.page + 1) * data.limit - 1);

    if (!data.include_void) q = q.eq("is_void", false);
    if (data.from) q = q.gte("expense_date", data.from);
    if (data.to) q = q.lte("expense_date", data.to);

    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const saveExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => expenseSchema.parse(input?.data ?? input))
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("expenses")
      .insert({ ...data, created_by: context.userId })
      .select()
      .single();
    if (error) throw error;
    return inserted;
  });

// Void (soft-delete) — never hard-delete
export const voidExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z
      .object({
        id: z.string().uuid(),
        void_reason: z.string().min(1),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("expenses")
      .update({
        is_void: true,
        void_reason: data.void_reason,
        void_at: new Date().toISOString(),
        void_by: context.userId,
      })
      .eq("id", data.id)
      .eq("is_void", false); // prevent double-void
    if (error) throw error;
    return { ok: true };
  });
