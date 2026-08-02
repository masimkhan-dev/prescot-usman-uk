import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const saleItemSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  quantity: z.number().int().positive(),
  unit_price: z.number().min(0),
  total: z.number().min(0),
});

const saleSchema = z.object({
  customer_id: z.string().optional().nullable(),
  items: z.array(saleItemSchema),
  discount: z.number().min(0).default(0),
  total: z.number().min(0),
  payment_method: z.enum(["cash", "card", "bank_transfer"]),
});

export const createSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => saleSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Get max warranty_days among items to compute warranty_until
    const productIds = data.items.map((i) => i.product_id);
    const { data: prods } = await context.supabase
      .from("products")
      .select("id, warranty_days, stock_quantity")
      .in("id", productIds);
    const maxWarranty = Math.max(0, ...(prods || []).map((p) => p.warranty_days || 0));
    const warrantyUntil = maxWarranty > 0
      ? new Date(Date.now() + maxWarranty * 86400000).toISOString().slice(0, 10)
      : null;

    const { data: sale, error: saleError } = await context.supabase
      .from("sales")
      .insert({
        customer_id: data.customer_id,
        total: data.total,
        discount: data.discount,
        warranty_until: warrantyUntil,
        payment_method: data.payment_method,
        status: "completed",
        created_by: context.userId,
      })
      .select()
      .single();
    if (saleError) throw saleError;

    const saleItems = data.items.map((item) => ({
      sale_id: sale.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
    }));
    const { error: itemsError } = await context.supabase.from("sale_items").insert(saleItems);
    if (itemsError) throw itemsError;

    for (const item of data.items) {
      const prod = (prods || []).find((p) => p.id === item.product_id);
      const newStock = Math.max((prod?.stock_quantity || 0) - item.quantity, 0);
      await context.supabase
        .from("products")
        .update({ stock_quantity: newStock })
        .eq("id", item.product_id);
      await context.supabase.from("stock_movements").insert({
        product_id: item.product_id,
        quantity_change: -item.quantity,
        reason: "sale",
        ref_id: sale.id,
        created_by: context.userId,
      });
    }

    return sale;
  });

export const getSaleDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: sale, error } = await context.supabase
      .from("sales")
      .select("*, customers(name, phone, email, address), sale_items(*)")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    return sale;
  });

export const listSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      from: z.string().optional().nullable(),
      to: z.string().optional().nullable(),
      customer_id: z.string().optional().nullable(),
      search: z.string().optional().nullable(),
    }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("sales")
      .select("*, customers(name, phone)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.from) q = q.gte("created_at", `${data.from}T00:00:00Z`);
    if (data.to) q = q.lte("created_at", `${data.to}T23:59:59Z`);
    if (data.customer_id) q = q.eq("customer_id", data.customer_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    const term = (data.search || "").trim().toLowerCase();
    if (!term) return rows || [];
    return (rows || []).filter((r) => r.id.toLowerCase().startsWith(term) || r.id.slice(0, 8).toLowerCase() === term);
  });

export const listSaleReturns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sale_id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("sale_returns")
      .select("*, sale_return_items(*)")
      .eq("sale_id", data.sale_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows || [];
  });

const returnSchema = z.object({
  sale_id: z.string(),
  reason: z.string().optional().nullable(),
  refund_method: z.enum(["cash", "card", "bank_transfer"]).default("cash"),
  items: z.array(
    z.object({
      sale_item_id: z.string(),
      product_id: z.string().nullable(),
      product_name: z.string(),
      quantity: z.number().int().positive(),
      unit_price: z.number().min(0),
    })
  ).min(1),
});

export const createSaleReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => returnSchema.parse(input))
  .handler(async ({ data, context }) => {
    const total = data.items.reduce((a, i) => a + i.quantity * i.unit_price, 0);

    const { data: ret, error } = await context.supabase
      .from("sale_returns")
      .insert({
        sale_id: data.sale_id,
        total,
        reason: data.reason,
        refund_method: data.refund_method,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw error;

    const { error: itemsErr } = await context.supabase.from("sale_return_items").insert(
      data.items.map((i) => ({
        return_id: ret.id,
        sale_item_id: i.sale_item_id,
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total: i.quantity * i.unit_price,
      }))
    );
    if (itemsErr) throw itemsErr;

    // Return stock
    for (const item of data.items) {
      if (!item.product_id) continue;
      const { data: prod } = await context.supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", item.product_id)
        .single();
      await context.supabase
        .from("products")
        .update({ stock_quantity: (prod?.stock_quantity || 0) + item.quantity })
        .eq("id", item.product_id);
      await context.supabase.from("stock_movements").insert({
        product_id: item.product_id,
        quantity_change: item.quantity,
        reason: "return",
        ref_id: ret.id,
        created_by: context.userId,
      });
    }

    // Update sale status: full or partial
    const { data: sale } = await context.supabase
      .from("sales")
      .select("total, sale_items(quantity)")
      .eq("id", data.sale_id)
      .single();
    const { data: allReturns } = await context.supabase
      .from("sale_returns")
      .select("total")
      .eq("sale_id", data.sale_id);
    const refunded = (allReturns || []).reduce((a, r) => a + Number(r.total || 0), 0);
    const status = refunded >= Number(sale?.total || 0) ? "refunded" : "partially_refunded";
    await context.supabase.from("sales").update({ status }).eq("id", data.sale_id);

    return { ...ret, status };
  });
