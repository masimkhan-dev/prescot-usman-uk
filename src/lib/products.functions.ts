import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  type: z.enum(["product", "part"]).default("product"),
  cost_price: z.number().min(0),
  sale_price: z.number().min(0),
  stock_quantity: z.number().int().min(0),
  low_stock_threshold: z.number().int().min(0),
  warranty_days: z.number().int().min(0).default(0),
  status: z.enum(["active", "inactive"]),
});

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { data: updated, error } = await context.supabase
        .from("products")
        .update(rest)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    } else {
      const { data: inserted, error } = await context.supabase
        .from("products")
        .insert(rest)
        .select()
        .single();
      if (error) throw error;
      return inserted;
    }
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      product_id: z.string(),
      quantity_change: z.number().int(),
      reason: z.enum(["adjustment", "purchase", "return", "damage"]),
      note: z.string().optional().nullable(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: product, error: pErr } = await context.supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", data.product_id)
      .single();
    if (pErr) throw pErr;
    const newStock = Math.max((product?.stock_quantity || 0) + data.quantity_change, 0);
    const { error: uErr } = await context.supabase
      .from("products")
      .update({ stock_quantity: newStock })
      .eq("id", data.product_id);
    if (uErr) throw uErr;
    const { error: mErr } = await context.supabase.from("stock_movements").insert({
      product_id: data.product_id,
      quantity_change: data.quantity_change,
      reason: data.reason,
      note: data.note,
      created_by: context.userId,
    });
    if (mErr) throw mErr;
    return { ok: true, new_stock: newStock };
  });

export const listStockMovements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ product_id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("stock_movements")
      .select("*")
      .eq("product_id", data.product_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return rows || [];
  });
