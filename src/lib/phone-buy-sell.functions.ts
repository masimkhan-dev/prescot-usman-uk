import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const buyPhoneSchema = z.object({
  idempotency_key: z.string().min(1),
  seller_customer_id: z.string().uuid({ message: "Seller customer ID is required" }),
  shift_id: z.string().uuid().optional().nullable(),

  // Device
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  storage: z.string().optional().nullable(),
  colour: z.string().optional().nullable(),
  imei1: z.string().min(1, "IMEI 1 is required"),
  imei2: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),

  // Condition
  condition_grade: z.enum(["Excellent", "Good", "Fair", "Faulty"]).default("Good"),
  condition_notes: z.string().optional().nullable(),
  battery_health: z.string().optional().nullable(),
  network_status: z.string().optional().nullable(),
  activation_lock_status: z.string().optional().nullable(),
  accessories: z.string().optional().nullable(),

  // Financials
  purchase_price_pence: z.number().int().nonnegative(),
  payment_method: z.enum(["cash", "bank_transfer", "other"]).default("cash"),
  bank_reference: z.string().optional().nullable(),

  // Declaration & Policy (Strict Mandatory Validation)
  seller_declaration_text: z.string().min(1, "Seller declaration text is required"),
  seller_confirmed_at: z.string().min(1, "Declaration confirmation timestamp is required"),
  seller_id_check: z
    .object({ type: z.string().optional(), reference: z.string().optional() })
    .optional()
    .nullable(),
  seller_age_confirmed: z.boolean().refine((v) => v === true, {
    message: "Seller age confirmation (18+) is required",
  }),

  notes: z.string().optional().nullable(),
});

const sellPhoneSchema = z.object({
  idempotency_key: z.string().min(1),
  phone_unit_id: z.string().uuid().optional().nullable(),
  buyer_customer_id: z.string().uuid().optional().nullable(),
  shift_id: z.string().uuid().optional().nullable(),
  selling_price_pence: z.number().int().nonnegative(),
  payment_method: z.enum(["cash", "card", "bank_transfer"]).default("cash"),
  amount_tendered_pence: z.number().int().nonnegative().optional().nullable(),
  warranty_days: z.number().int().nonnegative().optional().nullable(),
  warranty_policy_text: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),

  // Direct phone sale parameters (when phone_unit_id is null)
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  storage: z.string().optional().nullable(),
  colour: z.string().optional().nullable(),
  imei1: z.string().optional().nullable(),
  imei2: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  condition_grade: z.string().optional().nullable(),
  condition_notes: z.string().optional().nullable(),
  battery_health: z.string().optional().nullable(),
  network_status: z.string().optional().nullable(),
  cost_price_pence: z.number().int().nonnegative().optional().nullable(),
});

const listPhoneUnitsSchema = z.object({
  search: z.string().optional().nullable(),
  status: z.enum(["in_stock", "sold", "all"]).optional().nullable(),
  page: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

// ---------------------------------------------------------------------------
// buyPhone — calls the buy_phone RPC
// ---------------------------------------------------------------------------
export const buyPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => buyPhoneSchema.parse(input?.data ?? input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as any).rpc("buy_phone", {
      p_idempotency_key: data.idempotency_key,
      p_seller_customer_id: data.seller_customer_id,
      p_shift_id: data.shift_id ?? null,
      p_brand: data.brand,
      p_model: data.model,
      p_storage: data.storage ?? null,
      p_colour: data.colour ?? null,
      p_imei1: data.imei1,
      p_imei2: data.imei2 ?? null,
      p_serial_number: data.serial_number ?? null,
      p_condition_grade: data.condition_grade,
      p_condition_notes: data.condition_notes ?? null,
      p_battery_health: data.battery_health ?? null,
      p_network_status: data.network_status ?? null,
      p_activation_lock_status: data.activation_lock_status ?? null,
      p_accessories: data.accessories ?? null,
      p_purchase_price_pence: data.purchase_price_pence,
      p_payment_method: data.payment_method,
      p_bank_reference: data.bank_reference ?? null,
      p_seller_declaration_text: data.seller_declaration_text,
      p_seller_confirmed_at: data.seller_confirmed_at,
      p_seller_id_check: data.seller_id_check ?? null,
      p_seller_age_confirmed: data.seller_age_confirmed,
      p_notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return result as {
      phone_unit_id: string;
      stock_number: string;
      transaction_id: string;
      duplicate: boolean;
    };
  });

// ---------------------------------------------------------------------------
// sellPhone — calls the sell_phone RPC
// ---------------------------------------------------------------------------
export const sellPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => sellPhoneSchema.parse(input?.data ?? input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as any).rpc("sell_phone", {
      p_idempotency_key: data.idempotency_key,
      p_phone_unit_id: data.phone_unit_id ?? null,
      p_buyer_customer_id: data.buyer_customer_id ?? null,
      p_shift_id: data.shift_id ?? null,
      p_selling_price_pence: data.selling_price_pence,
      p_payment_method: data.payment_method,
      p_amount_tendered_pence: data.amount_tendered_pence ?? null,
      p_warranty_days: data.warranty_days ?? null,
      p_warranty_policy_text: data.warranty_policy_text ?? null,
      p_notes: data.notes ?? null,
      p_brand: data.brand ?? null,
      p_model: data.model ?? null,
      p_storage: data.storage ?? null,
      p_colour: data.colour ?? null,
      p_imei1: data.imei1 ?? null,
      p_imei2: data.imei2 ?? null,
      p_serial_number: data.serial_number ?? null,
      p_condition_grade: data.condition_grade ?? 'Good',
      p_condition_notes: data.condition_notes ?? null,
      p_battery_health: data.battery_health ?? null,
      p_network_status: data.network_status ?? null,
      p_cost_price_pence: data.cost_price_pence ?? null,
    });
    if (error) throw new Error(error.message);
    return result as {
      sale_id: string;
      invoice_number: string;
      sale_item_id: string;
      total_pence: number;
      change_pence: number | null;
      warranty_until: string | null;
      duplicate: boolean;
    };
  });

// ---------------------------------------------------------------------------
// listPhoneUnits — paginated list with search
// ---------------------------------------------------------------------------
export const listPhoneUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    listPhoneUnitsSchema.parse(input?.data ?? input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    let q = db
      .from("phone_units")
      .select(
        `
        id, stock_number, brand, model, storage, colour,
        imei1, imei2, condition_grade, purchase_cost_pence,
        status, purchased_at, sold_at, created_at,
        phone_purchase_transactions(
          id, purchase_number, seller_customer_id, payment_method,
          customers!phone_purchase_transactions_seller_customer_id_fkey(id, name, phone)
        ),
        sale_items(
          id, sale_id, unit_price_pence, line_total_pence,
          warranty_days, warranty_until,
          sales(id, invoice_number, customer_id, created_at,
            customers!sales_customer_id_fkey(id, name, phone)
          )
        )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.page * data.limit, (data.page + 1) * data.limit - 1);

    if (data.status && data.status !== "all") {
      q = q.eq("status", data.status);
    }

    if (data.search?.trim()) {
      const t = data.search.trim();
      q = q.or(
        `stock_number.ilike.%${t}%,brand.ilike.%${t}%,model.ilike.%${t}%,imei1.ilike.%${t}%,imei2.ilike.%${t}%`,
      );
    }

    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0 };
  });

// ---------------------------------------------------------------------------
// getPhoneUnitDetail — full detail for one phone unit
// ---------------------------------------------------------------------------
export const getPhoneUnitDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z.object({ id: z.string().uuid() }).parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: unit, error } = await db
      .from("phone_units")
      .select(
        `
        *,
        phone_purchase_transactions(
          *,
          customers!phone_purchase_transactions_seller_customer_id_fkey(id, name, phone, address, postcode)
        ),
        sale_items(
          *,
          sales(
            id, invoice_number, created_at, customer_id,
            customers!sales_customer_id_fkey(id, name, phone)
          )
        )
      `,
      )
      .eq("id", data.id)
      .single();
    if (error) throw error;
    return unit;
  });

// ---------------------------------------------------------------------------
// searchPhoneUnits — typeahead for sell form (in_stock only)
// ---------------------------------------------------------------------------
export const searchPhoneUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z
      .object({ q: z.string().optional().nullable() })
      .parse(input?.data ?? input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const term = (data.q || "").trim();
    if (!term) return [];

    const db = context.supabase as any;
    const { data: rows, error } = await db
      .from("phone_units")
      .select("id, stock_number, brand, model, storage, colour, imei1, condition_grade, purchase_cost_pence")
      .eq("status", "in_stock")
      .or(
        `stock_number.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%,imei1.ilike.%${term}%`,
      )
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) throw error;
    return rows ?? [];
  });

// ---------------------------------------------------------------------------
// getPhoneSummary — for Reports page phone panel
// Informational breakdown only; phone revenue is ALREADY in overall sales totals
// ---------------------------------------------------------------------------
export const getPhoneSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as any;
    const { data, error } = await db
      .from("v_phone_units_summary")
      .select("*")
      .single();
    if (error) throw error;
    return data as {
      units_in_stock: number;
      units_sold: number;
      units_total: number;
      stock_cost_value_pence: number;
      total_purchased_pence: number;
      sold_revenue_pence: number;
      sold_cogs_pence: number;
      gross_margin_pence: number;
    };
  });
