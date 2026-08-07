import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Pence helpers — all monetary values are integers (pence) in the DB
// ---------------------------------------------------------------------------
/** Convert £-pounds (float input) → integer pence */
export function toPence(pounds: number): number {
  return Math.round(pounds * 100);
}
/** Convert integer pence → £-pounds for display */
export function fromPence(pence: number): number {
  return pence / 100;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const saleItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  unit_price_pence: z.number().int().nonnegative(),
  discount_pence: z.number().int().nonnegative().default(0),
  serial_unit_id: z.string().uuid().optional().nullable(),
});

const completeSaleSchema = z.object({
  idempotency_key: z.string().min(1),
  customer_id: z.string().uuid().optional().nullable(),
  shift_id: z.string().uuid().optional().nullable(),
  discount_pence: z.number().int().nonnegative().default(0),
  payment_method: z.enum(["cash", "card", "bank_transfer"]).default("cash"),
  amount_tendered_pence: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1),
});

const refundSchema = z.object({
  sale_id: z.string().uuid(),
  refund_method: z.enum(["cash", "card", "bank_transfer", "credit_note"]).default("cash"),
  reason: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        sale_item_id: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

const listSalesSchema = z.object({
  from: z.string().optional().nullable(),
  to: z.string().optional().nullable(),
  customer_id: z.string().uuid().optional().nullable(),
  search: z.string().optional().nullable(),
  status: z.enum(["completed", "partially_refunded", "refunded", "voided"]).optional().nullable(),
  page: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

// ---------------------------------------------------------------------------
// completeSale — calls the complete_sale RPC
// ---------------------------------------------------------------------------
export const completeSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => completeSaleSchema.parse(input?.data ?? input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("complete_sale", {
      p_idempotency_key: data.idempotency_key,
      p_customer_id: data.customer_id ?? null,
      p_shift_id: data.shift_id ?? null,
      p_discount_pence: data.discount_pence,
      p_payment_method: data.payment_method,
      p_amount_tendered_pence: data.amount_tendered_pence ?? null,
      p_notes: data.notes ?? null,
      p_items: data.items,
    });
    if (error) throw new Error(error.message);
    return result as {
      sale_id: string;
      invoice_number: string;
      total_pence: number;
      change_pence: number | null;
      duplicate: boolean;
    };
  });

// ---------------------------------------------------------------------------
// refundSale — calls the refund_sale RPC
// ---------------------------------------------------------------------------
export const refundSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => refundSchema.parse(input?.data ?? input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("refund_sale", {
      p_sale_id: data.sale_id,
      p_refund_method: data.refund_method,
      p_reason: data.reason ?? null,
      p_items: data.items,
    });
    if (error) throw new Error(error.message);
    return result as {
      return_id: string;
      crn_number: string;
      credit_note_id: string;
      return_total_pence: number;
      sale_status: string;
    };
  });

// ---------------------------------------------------------------------------
// getSaleDetail
// ---------------------------------------------------------------------------
export const getSaleDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => z.object({ id: z.string().uuid() }).parse(input?.data ?? input))
  .handler(async ({ data, context }) => {
    const { data: sale, error } = await context.supabase
      .from("sales")
      .select(
        `
        *,
        customers(name, phone, email, address),
        sale_items(
          id, product_id, product_name, quantity,
          unit_price_pence, discount_pence, line_total_pence, cost_price_pence
        )
      `,
      )
      .eq("id", data.id)
      .single();
    if (error) throw error;
    const { data: payments, error: paymentError } = await context.supabase
      .from("payments")
      .select("method, amount_pence")
      .eq("ref_type", "sale")
      .eq("ref_id", data.id)
      .order("created_at", { ascending: true });
    if (paymentError) throw paymentError;

    return { ...sale, payments: payments ?? [] };
  });

// ---------------------------------------------------------------------------
// listSales — server-side search + pagination
// ---------------------------------------------------------------------------
export const listSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => listSalesSchema.parse(input?.data ?? input ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("sales")
      .select("*, customers(name, phone)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.page * data.limit, (data.page + 1) * data.limit - 1);

    if (data.from) q = q.gte("created_at", `${data.from}T00:00:00+00:00`);
    if (data.to) q = q.lte("created_at", `${data.to}T23:59:59+00:00`);
    if (data.customer_id) q = q.eq("customer_id", data.customer_id);
    if (data.status) q = q.eq("status", data.status);

    // SQL ILIKE search on invoice_number (no JS filter after fetch)
    if (data.search?.trim()) {
      const term = data.search.trim();
      q = q.or(`invoice_number.ilike.%${term}%`);
    }

    const { data: rows, count, error } = await q;
    if (error) throw error;

    const saleRows = rows ?? [];
    const saleIds = saleRows.map((sale) => sale.id);
    let paymentMethods = new Map<string, string>();
    if (saleIds.length > 0) {
      const { data: payments, error: paymentError } = await context.supabase
        .from("payments")
        .select("ref_id, method")
        .eq("ref_type", "sale")
        .in("ref_id", saleIds);
      if (paymentError) throw paymentError;
      paymentMethods = new Map((payments ?? []).map((payment) => [payment.ref_id, payment.method]));
    }

    return {
      rows: saleRows.map((sale) => ({
        ...sale,
        payment_method: paymentMethods.get(sale.id) ?? null,
      })),
      total: count ?? 0,
      page: data.page,
      limit: data.limit,
    };
  });

// ---------------------------------------------------------------------------
// listSaleReturns
// ---------------------------------------------------------------------------
export const listSaleReturns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => z.object({ sale_id: z.string().uuid() }).parse(input?.data ?? input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("sale_returns")
      .select("*, return_items(*), credit_notes(crn_number, balance_pence)")
      .eq("sale_id", data.sale_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });
