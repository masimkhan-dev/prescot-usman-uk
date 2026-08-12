import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const productUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  type: z.enum(["product", "part", "service"]).default("product"),
  track_type: z.enum(["quantity", "serial"]).default("quantity"),
  cost_price_pence: z.coerce.number().int().nonnegative(),
  sale_price_pence: z.coerce.number().int().nonnegative(),
  stock_quantity: z.coerce.number().int().nonnegative(),
  low_stock_threshold: z.coerce.number().int().nonnegative().default(5),
  warranty_days: z.coerce.number().int().nonnegative().default(0),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().optional().nullable(),
});

const listProductsSchema = z.object({
  search: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).optional().nullable(),
  page: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

// ---------------------------------------------------------------------------
// listProducts — server-side search, pagination, category filter
// ---------------------------------------------------------------------------
export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => listProductsSchema.parse(input?.data ?? input ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("products")
      .select("*", { count: "exact" })
      .order("name", { ascending: true })
      .range(data.page * data.limit, (data.page + 1) * data.limit - 1);

    if (data.status) {
      q = q.eq("status", data.status);
    } else {
      q = q.eq("status", "active"); // default: active only
    }

    if (data.category) q = q.eq("category", data.category);

    if (data.search?.trim()) {
      const t = data.search.trim();
      q = q.or(`name.ilike.%${t}%,sku.ilike.%${t}%,barcode.ilike.%${t}%`);
    }

    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, page: data.page, limit: data.limit };
  });

// ---------------------------------------------------------------------------
// listAllActiveProducts — for POS product grid (no pagination, filtered to active)
// ---------------------------------------------------------------------------
export const listAllActiveProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z.object({ search: z.string().optional().nullable() }).parse(input?.data ?? input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("products")
      .select(
        "id, name, category, sku, barcode, sale_price_pence, cost_price_pence, avg_cost_pence, stock_quantity, warranty_days, track_type, type",
      )
      .eq("status", "active")
      .order("name", { ascending: true })
      .limit(200);

    if (data.search?.trim()) {
      const t = data.search.trim();
      q = q.or(`name.ilike.%${t}%,sku.ilike.%${t}%,barcode.ilike.%${t}%`);
    }

    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

// ---------------------------------------------------------------------------
// saveProduct — upsert; marks inactive instead of deleting
// ---------------------------------------------------------------------------
export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => {
    try {
      return productUpsertSchema.parse(input?.data ?? input);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const issues = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
        throw new Error(`Validation error: ${issues}`);
      }
      throw err;
    }
  })
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload = {
      ...rest,
      sku: rest.sku?.trim() || null,
      barcode: rest.barcode?.trim() || null,
      // Keep avg_cost_pence in sync with cost_price_pence for new products
      avg_cost_pence: rest.cost_price_pence,
    };

    const handleSupabaseError = (error: { code?: string; message?: string; details?: string }) => {
      if (
        error.code === "23505" ||
        error.message?.includes("duplicate key") ||
        error.message?.includes("idx_products")
      ) {
        if (
          error.message?.includes("barcode") ||
          error.details?.includes("barcode") ||
          error.message?.includes("idx_products_barcode")
        ) {
          return new Error(`Barcode "${payload.barcode}" is already assigned to another product.`);
        }
        if (
          error.message?.includes("sku") ||
          error.details?.includes("sku") ||
          error.message?.includes("idx_products_sku") ||
          error.message?.includes("idx_products_sku_upper")
        ) {
          return new Error(`SKU "${payload.sku}" is already assigned to another product.`);
        }
      }
      return new Error(error.message || "Failed to save product");
    };

    if (id) {
      const { data: updated, error } = await context.supabase
        .from("products")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw handleSupabaseError(error);
      return updated;
    }

    const { data: inserted, error } = await context.supabase
      .from("products")
      .insert(payload)
      .select()
      .single();
    if (error) throw handleSupabaseError(error);

    // Automatically record opening stock movement if stock_quantity > 0
    if (inserted.stock_quantity > 0) {
      await context.supabase.from("stock_movements").insert({
        product_id: inserted.id,
        movement_type: "opening_count",
        qty_change: inserted.stock_quantity,
        qty_before: 0,
        qty_after: inserted.stock_quantity,
        unit_cost_pence: inserted.cost_price_pence,
        reason: "Initial opening stock setup",
        note: "Manual Product Setup",
        ref_id: inserted.id,
        created_by: context.userId,
      });
    }

    return inserted;
  });

// ---------------------------------------------------------------------------
// deactivateProduct — soft delete (status = inactive)
// ---------------------------------------------------------------------------
export const deactivateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => z.object({ id: z.string().uuid() }).parse(input?.data ?? input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("products")
      .update({ status: "inactive" })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// adjustStock — calls adjust_stock RPC (admin approval enforced server-side)
// ---------------------------------------------------------------------------
export const adjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z
      .object({
        product_id: z.string().uuid(),
        qty_change: z.coerce.number().int(),
        reason: z.string().min(1).default("adjustment"),
        note: z.string().optional().nullable(),
        approved_by: z.string().uuid().optional().nullable(),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("adjust_stock", {
      p_product_id: data.product_id,
      p_qty_change: data.qty_change,
      p_reason: data.reason,
      p_note: data.note ?? null,
      p_approved_by: data.approved_by ?? null,
    });
    if (error) throw new Error(error.message);
    return result as { adj_number: string; qty_before: number; qty_after: number };
  });

// ---------------------------------------------------------------------------
// listStockMovements — paginated per product
// ---------------------------------------------------------------------------
export const listStockMovements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        product_id: z.string().uuid().optional().nullable(),
        page: z.number().int().nonnegative().default(0),
        limit: z.number().int().positive().max(100).default(50),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("stock_movements")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.page * data.limit, (data.page + 1) * data.limit - 1);

    if (data.product_id) q = q.eq("product_id", data.product_id);

    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0 };
  });

// ---------------------------------------------------------------------------
// listProductCategories — distinct categories for filter UI
// ---------------------------------------------------------------------------
export const listProductCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("products")
      .select("category")
      .eq("status", "active");
    if (error) throw error;
    return [...new Set((data ?? []).map((p) => p.category))].sort();
  });

// ---------------------------------------------------------------------------
// bulkItemSchema & importOpeningStock
// ---------------------------------------------------------------------------
const bulkItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  type: z.enum(["product", "part", "service"]).default("product"),
  cost_price_pence: z.coerce.number().int().nonnegative(),
  sale_price_pence: z.coerce.number().int().nonnegative(),
  stock_quantity: z.coerce.number().int().nonnegative(),
  low_stock_threshold: z.coerce.number().int().nonnegative().default(5),
  warranty_days: z.coerce.number().int().nonnegative().default(0),
});

export const importOpeningStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z
      .array(bulkItemSchema)
      .min(1)
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("bulk_import_opening_stock", {
      p_products: data,
    });
    if (error) throw new Error(error.message);
    return result as { imported_count: number };
  });

// ---------------------------------------------------------------------------
// getOpeningStockSummary
// ---------------------------------------------------------------------------
export const getOpeningStockSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: movements, error } = await context.supabase
      .from("stock_movements")
      .select("product_id, qty_change, unit_cost_pence, products(id, name, sale_price_pence)")
      .eq("movement_type", "opening_count");
    if (error) throw error;

    let totalUnits = 0;
    let openingCostValuePence = 0;
    let openingRetailValuePence = 0;
    const prodSet = new Set<string>();

    for (const m of movements ?? []) {
      if (m.product_id) prodSet.add(m.product_id);
      const qty = m.qty_change ?? 0;
      const costPence = m.unit_cost_pence ?? 0;
      const prod = m.products as { sale_price_pence?: number } | null;
      const salePence = prod?.sale_price_pence ?? 0;

      totalUnits += qty;
      openingCostValuePence += qty * costPence;
      openingRetailValuePence += qty * salePence;
    }

    return {
      totalProducts: prodSet.size,
      totalUnits,
      openingCostValuePence,
      openingRetailValuePence,
      potentialProfitPence: openingRetailValuePence - openingCostValuePence,
    };
  });
