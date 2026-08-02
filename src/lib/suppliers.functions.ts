import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const supplierSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const listSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("suppliers").select("*").order("name");
    if (error) throw error;
    return data || [];
  });

export const saveSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => supplierSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload = { ...rest, email: rest.email || null };
    if (id) {
      const { data: updated, error } = await context.supabase
        .from("suppliers").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return updated;
    }
    const { data: inserted, error } = await context.supabase
      .from("suppliers").insert(payload).select().single();
    if (error) throw error;
    return inserted;
  });

export const deleteSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("suppliers").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listPurchaseOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("purchase_orders")
      .select("*, suppliers(name), purchase_order_items(*)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  });

const poSchema = z.object({
  supplier_id: z.string().nullable(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(
    z.object({
      product_id: z.string().nullable(),
      product_name: z.string().min(1),
      quantity: z.number().int().positive(),
      unit_cost: z.number().min(0),
    })
  ).min(1),
});

export const createPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => poSchema.parse(input))
  .handler(async ({ data, context }) => {
    const total = data.items.reduce((a, i) => a + i.quantity * i.unit_cost, 0);
    const { data: po, error } = await context.supabase
      .from("purchase_orders")
      .insert({
        supplier_id: data.supplier_id,
        reference: data.reference,
        notes: data.notes,
        total,
        status: "ordered",
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw error;

    const { error: itemsErr } = await context.supabase.from("purchase_order_items").insert(
      data.items.map((i) => ({
        purchase_order_id: po.id,
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_cost: i.unit_cost,
        total: i.quantity * i.unit_cost,
      }))
    );
    if (itemsErr) throw itemsErr;
    return po;
  });

export const receivePurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string(), update_cost_price: z.boolean().default(false) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: po, error } = await context.supabase
      .from("purchase_orders")
      .select("*, purchase_order_items(*)")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    if (po.status === "received") throw new Error("This purchase order is already received.");

    for (const item of po.purchase_order_items || []) {
      if (!item.product_id) continue;
      const { data: prod } = await context.supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", item.product_id)
        .single();
      const update: { stock_quantity: number; cost_price?: number } = {
        stock_quantity: (prod?.stock_quantity || 0) + item.quantity,
      };
      if (data.update_cost_price) update.cost_price = item.unit_cost;
      await context.supabase.from("products").update(update).eq("id", item.product_id);

      await context.supabase.from("stock_movements").insert({
        product_id: item.product_id,
        quantity_change: item.quantity,
        reason: "purchase",
        ref_id: po.id,
        created_by: context.userId,
      });
    }

    const { error: uErr } = await context.supabase
      .from("purchase_orders")
      .update({ status: "received", received_at: new Date().toISOString() })
      .eq("id", po.id);
    if (uErr) throw uErr;
    return { ok: true };
  });

export const cancelPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("purchase_orders")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
