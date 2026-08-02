import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const partSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  quantity: z.number().int().positive(),
  unit_price: z.number().min(0),
});

const repairSchema = z.object({
  id: z.string().optional(),
  customer_id: z.string().optional().nullable(),
  device: z.string().min(1),
  brand: z.string().optional().nullable(),
  issue: z.string().min(1),
  status: z.enum(["pending", "in-progress", "ready", "completed", "cancelled"]),
  method: z.enum(["walk-in", "door-to-door", "mail-in"]),
  price: z.number().min(0),
  labour_cost: z.number().min(0).default(0),
  paid: z.boolean().default(false),
  technician_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  parts: z.array(partSchema).default([]),
});

export const listRepairs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("repair_tickets")
      .select("*, customers(id, name, phone)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  });

export const getRepairDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: repair, error } = await context.supabase
      .from("repair_tickets")
      .select("*, customers(name, phone, email, address), repair_parts(*)")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    return repair;
  });

export const saveRepair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => repairSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, parts, ...rest } = data;

    // Compute warranty_until on ready/completed if not set
    let warranty_until: string | null = null;
    if (rest.status === "ready" || rest.status === "completed") {
      warranty_until = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10); // 90-day repair warranty
    }

    const payload = {
      ...rest,
      technician_id: rest.technician_id || context.userId,
      ...(warranty_until ? { warranty_until } : {}),
    };

    let repairId = id;
    if (id) {
      const { error } = await context.supabase
        .from("repair_tickets")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await context.supabase
        .from("repair_tickets")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      repairId = inserted.id;
    }

    // Handle parts: only inserted parts (existing ones are kept). To keep it simple,
    // we treat the parts array as "new parts to add now" — each save appends deducted parts.
    if (parts && parts.length > 0 && repairId) {
      const rows = parts.map((p) => ({
        repair_id: repairId!,
        product_id: p.product_id,
        product_name: p.product_name,
        quantity: p.quantity,
        unit_price: p.unit_price,
      }));
      const { error: pErr } = await context.supabase.from("repair_parts").insert(rows);
      if (pErr) throw pErr;

      for (const part of parts) {
        const { data: product } = await context.supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", part.product_id)
          .single();
        const newStock = Math.max((product?.stock_quantity || 0) - part.quantity, 0);
        await context.supabase
          .from("products")
          .update({ stock_quantity: newStock })
          .eq("id", part.product_id);
        await context.supabase.from("stock_movements").insert({
          product_id: part.product_id,
          quantity_change: -part.quantity,
          reason: "repair",
          ref_id: repairId,
          created_by: context.userId,
        });
      }
    }

    return { id: repairId };
  });

export const deleteRepair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("repair_tickets").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const markRepairPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string(), paid: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("repair_tickets")
      .update({ paid: data.paid })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listTechnicians = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("user_id, full_name, email");
    if (error) throw error;
    return data || [];
  });
