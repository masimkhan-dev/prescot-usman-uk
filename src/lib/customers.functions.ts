import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const customerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Server-side search + pagination
export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        search: z.string().optional().nullable(),
        page: z.number().int().nonnegative().default(0),
        limit: z.number().int().positive().max(100).default(25),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("customers")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("name", { ascending: true })
      .range(data.page * data.limit, (data.page + 1) * data.limit - 1);

    if (data.search?.trim()) {
      const t = data.search.trim();
      q = q.or(`name.ilike.%${t}%,phone.ilike.%${t}%,email.ilike.%${t}%`);
    }

    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0 };
  });

// Fast customer search for POS typeahead (no pagination, max 20)
export const searchCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ q: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("customers")
      .select("id, name, phone, email")
      .eq("is_active", true)
      .or(`name.ilike.%${data.q}%,phone.ilike.%${data.q}%`)
      .order("name")
      .limit(20);
    if (error) throw error;
    return rows ?? [];
  });

export const saveCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => customerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload = { ...rest, email: rest.email || null };
    if (id) {
      const { data: updated, error } = await context.supabase
        .from("customers")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    }
    const { data: inserted, error } = await context.supabase
      .from("customers")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return inserted;
  });

// Soft-delete: mark inactive (FK-linked records preserved)
export const deactivateCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("customers")
      .update({ is_active: false })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
