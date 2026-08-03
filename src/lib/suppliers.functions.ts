import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------
const supplierSchema = z.object({
  id: z.string().uuid().optional(),
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
    return data ?? [];
  });

export const saveSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => supplierSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload = { ...rest, email: rest.email || null };
    if (id) {
      const { data: updated, error } = await context.supabase
        .from("suppliers")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    }
    const { data: inserted, error } = await context.supabase
      .from("suppliers")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return inserted;
  });

// Suppliers are deactivated, not deleted (admin only — enforced by RLS)
export const deleteSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // Hard delete only if no related POs — otherwise error is thrown by FK
    const { error } = await context.supabase.from("suppliers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Purchase Orders
// ---------------------------------------------------------------------------
const poSchema = z.object({
  supplier_id: z.string().uuid().nullable(),
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid().nullable(),
        product_name: z.string().min(1),
        qty_ordered: z.number().int().positive(),
        unit_cost_pence: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

export const listPurchaseOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z
          .enum(["draft", "ordered", "partial", "received", "cancelled"])
          .optional()
          .nullable(),
        page: z.number().int().nonnegative().default(0),
        limit: z.number().int().positive().max(100).default(25),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("purchase_orders")
      .select("*, suppliers(name), purchase_order_items(*)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.page * data.limit, (data.page + 1) * data.limit - 1);

    if (data.status) q = q.eq("status", data.status);

    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const createPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => poSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Compute total server-side
    const total_pence = data.items.reduce((sum, i) => sum + i.qty_ordered * i.unit_cost_pence, 0);

    // Assign PO number via RPC
    const { data: poNum, error: seqErr } = await context.supabase.rpc("next_doc_number", {
      p_type: "PO",
    });
    if (seqErr) throw seqErr;

    const { data: po, error } = await context.supabase
      .from("purchase_orders")
      .insert({
        supplier_id: data.supplier_id,
        po_number: poNum,
        notes: data.notes,
        total_pence,
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
        qty_ordered: i.qty_ordered,
        qty_received: 0,
        unit_cost_pence: i.unit_cost_pence,
        line_total_pence: i.qty_ordered * i.unit_cost_pence,
      })),
    );
    if (itemsErr) throw itemsErr;
    return po;
  });

export const receivePurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        po_id: z.string().uuid(),
        idempotency_key: z.string().min(1),
        update_cost_price: z.boolean().default(false),
        notes: z.string().optional().nullable(),
        items: z
          .array(
            z.object({
              po_item_id: z.string().uuid(),
              qty_received: z.number().int().positive(),
            }),
          )
          .min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("receive_purchase_order", {
      p_po_id: data.po_id,
      p_idempotency_key: data.idempotency_key,
      p_update_cost_price: data.update_cost_price,
      p_notes: data.notes ?? null,
      p_items: data.items,
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const cancelPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("purchase_orders")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("status", "draft"); // only cancel drafts
    if (error) throw error;
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Supplier Payments
// ---------------------------------------------------------------------------
export const recordSupplierPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        supplier_id: z.string().uuid(),
        amount_pence: z.number().int().positive(),
        method: z.enum(["cash", "card", "bank_transfer"]).default("bank_transfer"),
        purchase_order_id: z.string().uuid().optional().nullable(),
        reference: z.string().optional().nullable(),
        payment_date: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("record_supplier_payment", {
      p_supplier_id: data.supplier_id,
      p_amount_pence: data.amount_pence,
      p_method: data.method,
      p_purchase_order_id: data.purchase_order_id ?? null,
      p_reference: data.reference ?? null,
      p_payment_date: data.payment_date ?? null,
      p_notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const listSupplierPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ supplier_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("supplier_payments")
      .select("*")
      .eq("supplier_id", data.supplier_id)
      .order("payment_date", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });
