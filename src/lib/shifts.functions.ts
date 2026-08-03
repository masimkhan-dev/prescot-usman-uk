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
  .inputValidator((input) =>
    z
      .object({
        page: z.number().int().nonnegative().default(0),
        limit: z.number().int().positive().max(100).default(30),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const {
      data: rows,
      count,
      error,
    } = await context.supabase
      .from("shifts")
      .select("*, profiles!shifts_opened_by_fkey(full_name)", { count: "exact" })
      .order("opened_at", { ascending: false })
      .range(data.page * data.limit, (data.page + 1) * data.limit - 1);
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0 };
  });

// openShift — calls the open_shift RPC (prevents double-open with FOR UPDATE SKIP LOCKED)
export const openShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ opening_float_pence: z.number().int().nonnegative() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("open_shift", {
      p_opening_float_pence: data.opening_float_pence,
    });
    if (error) throw new Error(error.message);
    return result as { shift_id: string };
  });

// closeShift — calls the close_shift RPC; server recomputes totals, does NOT accept client totals
export const closeShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        shift_id: z.string().uuid(),
        counted_cash_pence: z.number().int().nonnegative(),
        notes: z.string().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("close_shift", {
      p_shift_id: data.shift_id,
      p_counted_cash_pence: data.counted_cash_pence,
      p_notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return result;
  });

// getShiftReconciliation — reads from the v_shift_reconciliation view
export const getShiftReconciliation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ shift_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("v_shift_reconciliation")
      .select("*")
      .eq("shift_id", data.shift_id)
      .single();
    if (error) throw error;
    return row;
  });
