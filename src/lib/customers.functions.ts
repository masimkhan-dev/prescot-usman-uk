import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("customers")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  });

export const saveCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => customerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { data: updated, error } = await context.supabase
        .from("customers")
        .update(rest)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    } else {
      const { data: inserted, error } = await context.supabase
        .from("customers")
        .insert(rest)
        .select()
        .single();
      if (error) throw error;
      return inserted;
    }
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("customers").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
