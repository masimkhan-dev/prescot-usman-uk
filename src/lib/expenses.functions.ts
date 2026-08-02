import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const expenseSchema = z.object({
  id: z.string().optional(),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().min(0),
  expense_date: z.string(),
});

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  });

export const saveExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => expenseSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload = { ...rest, created_by: context.userId };
    if (id) {
      const { data: updated, error } = await context.supabase
        .from("expenses")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    } else {
      const { data: inserted, error } = await context.supabase
        .from("expenses")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return inserted;
    }
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("expenses").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
