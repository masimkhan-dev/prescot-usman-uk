import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: adminError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (adminError || !isAdmin) throw new Error("Forbidden: admin only");

    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("*");
    if (error) throw error;

    const { data: roles } = await context.supabase.from("user_roles").select("*");

    return (profiles || []).map((p) => ({
      ...p,
      user_roles: (roles || []).filter((r) => r.user_id === p.user_id),
    }));

  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ user_id: z.string(), role: z.enum(["admin", "staff", "technician"]) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: adminError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (adminError || !isAdmin) throw new Error("Forbidden: admin only");

    const { error } = await context.supabase
      .from("user_roles")
      .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id, role" });
    if (error) throw error;
    return { ok: true };
  });


export const removeUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ user_id: z.string(), role: z.enum(["admin", "staff", "technician"]) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: adminError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (adminError || !isAdmin) throw new Error("Forbidden: admin only");

    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", data.role);
    if (error) throw error;
    return { ok: true };
  });
