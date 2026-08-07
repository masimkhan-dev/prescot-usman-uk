import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const repairUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional().nullable(),
  device: z.string().min(1),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  imei: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  device_condition: z.record(z.boolean()).optional().nullable(),
  accessories_received: z.array(z.string()).optional().nullable(),
  unlock_reference: z.string().max(200).optional().nullable(),
  issue: z.string().min(1),
  method: z.enum(["walk-in", "door-to-door", "mail-in"]).default("walk-in"),
  labour_price_pence: z.number().int().nonnegative().default(0),
  collection_charge_pence: z.number().int().nonnegative().default(0),
  total_price_pence: z.number().int().nonnegative().default(0),
  estimate_approved: z.boolean().default(false),
  estimate_approved_by: z.string().optional().nullable(),
  technician_id: z.string().uuid().optional().nullable(),
  warranty_days: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
});

const repairPartSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  unit_cost_pence: z.number().int().nonnegative().default(0),
});

const listRepairsSchema = z.object({
  status: z
    .enum([
      "pending",
      "assessed",
      "in_progress",
      "quality_check",
      "ready",
      "completed",
      "cancelled",
    ])
    .optional()
    .nullable(),
  search: z.string().optional().nullable(),
  technician_id: z.string().uuid().optional().nullable(),
  page: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

// ---------------------------------------------------------------------------
// listRepairs — paginated, server-filtered
// ---------------------------------------------------------------------------
export const listRepairs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => listRepairsSchema.parse(input?.data ?? input ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("repair_tickets")
      .select("*, customers(id, name, phone)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.page * data.limit, (data.page + 1) * data.limit - 1);

    if (data.status) q = q.eq("status", data.status);
    if (data.technician_id) q = q.eq("technician_id", data.technician_id);
    if (data.search?.trim()) {
      const t = data.search.trim();
      q = q.or(
        `rep_number.ilike.%${t}%,device.ilike.%${t}%,imei.ilike.%${t}%,serial_number.ilike.%${t}%`,
      );
    }

    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, page: data.page, limit: data.limit };
  });

// ---------------------------------------------------------------------------
// getRepairDetail
// ---------------------------------------------------------------------------
export const getRepairDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => z.object({ id: z.string().uuid() }).parse(input?.data ?? input))
  .handler(async ({ data, context }) => {
    const { data: repair, error } = await context.supabase
      .from("repair_tickets")
      .select(
        `
        *,
        customers(name, phone, email, address),
        repair_parts(*, products(name)),
        repair_payments(*),
        repair_status_history(from_status, to_status, note, changed_at, changed_by),
        repair_warranty_claims(*)
      `,
      )
      .eq("id", data.id)
      .single();
    if (error) throw error;
    return repair;
  });

// ---------------------------------------------------------------------------
// saveRepair — upsert header only (parts issued via issueRepairParts RPC)
// ---------------------------------------------------------------------------
export const saveRepair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => repairUpsertSchema.parse(input?.data ?? input))
  .handler(async ({ data, context }) => {
    const { id, ...payload } = data;

    // Generate REP number for new tickets via RPC
    if (!id) {
      const { data: repNum, error: seqErr } = await context.supabase.rpc("next_doc_number", {
        p_type: "REP",
      });
      if (seqErr) throw seqErr;

      const { data: inserted, error } = await context.supabase
        .from("repair_tickets")
        .insert({ ...payload, rep_number: repNum, created_by: context.userId })
        .select()
        .single();
      if (error) throw error;

      // Record initial status history
      await context.supabase.from("repair_status_history").insert({
        repair_id: inserted.id,
        from_status: null,
        to_status: "pending",
        note: "Ticket created",
        changed_by: context.userId,
      });

      return inserted;
    }

    // Update existing — do NOT touch status here (use updateRepairStatus RPC)
    const { id: _id, ...safePayload } = data;
    const { status: _status, ...updatePayload } = safePayload as typeof safePayload & {
      status?: string;
    };

    const { data: updated, error } = await context.supabase
      .from("repair_tickets")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  });

// ---------------------------------------------------------------------------
// updateRepairStatus — controlled transition via RPC
// ---------------------------------------------------------------------------
export const updateRepairStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z
      .object({
        repair_id: z.string().uuid(),
        new_status: z.enum([
          "pending",
          "assessed",
          "in_progress",
          "quality_check",
          "ready",
          "completed",
          "cancelled",
        ]),
        note: z.string().optional().nullable(),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("update_repair_status", {
      p_repair_id: data.repair_id,
      p_new_status: data.new_status,
      p_note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return result;
  });

// ---------------------------------------------------------------------------
// issueRepairParts — idempotency-keyed RPC
// ---------------------------------------------------------------------------
export const issueRepairParts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z
      .object({
        repair_id: z.string().uuid(),
        idempotency_key: z.string().min(1),
        parts: z.array(repairPartSchema).min(1),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("issue_repair_parts", {
      p_repair_id: data.repair_id,
      p_idempotency_key: data.idempotency_key,
      p_parts: data.parts,
    });
    if (error) throw new Error(error.message);
    return result;
  });

// ---------------------------------------------------------------------------
// returnRepairParts — compensating stock restoration
// ---------------------------------------------------------------------------
export const returnRepairParts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z
      .object({
        repair_id: z.string().uuid(),
        part_ids: z.array(z.string().uuid()).min(1),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("return_repair_parts", {
      p_repair_id: data.repair_id,
      p_part_ids: data.part_ids,
    });
    if (error) throw new Error(error.message);
    return result;
  });

// ---------------------------------------------------------------------------
// recordRepairPayment
// ---------------------------------------------------------------------------
export const recordRepairPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) =>
    z
      .object({
        repair_id: z.string().uuid(),
        idempotency_key: z.string().min(1),
        amount_pence: z.number().int().positive(),
        method: z.enum(["cash", "card", "bank_transfer"]).default("cash"),
        is_deposit: z.boolean().default(false),
        shift_id: z.string().uuid().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("record_repair_payment", {
      p_repair_id: data.repair_id,
      p_idempotency_key: data.idempotency_key,
      p_amount_pence: data.amount_pence,
      p_method: data.method,
      p_is_deposit: data.is_deposit,
      p_shift_id: data.shift_id ?? null,
      p_notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return result;
  });

// ---------------------------------------------------------------------------
// listTechnicians
// ---------------------------------------------------------------------------
export const listTechnicians = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("is_active", true)
      .order("full_name");
    if (error) throw error;
    return data ?? [];
  });

// ---------------------------------------------------------------------------
// submitWarrantyClaim
// ---------------------------------------------------------------------------
export const submitWarrantyClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        repair_id: z.string().uuid(),
        description: z.string().min(5),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Verify warranty is still valid
    const { data: repair, error: re } = await context.supabase
      .from("repair_tickets")
      .select("warranty_until, status")
      .eq("id", data.repair_id)
      .single();
    if (re) throw re;
    if (!repair.warranty_until) throw new Error("This repair has no warranty");
    if (new Date(repair.warranty_until) < new Date())
      throw new Error("Warranty period has expired");

    const { data: claim, error } = await context.supabase
      .from("repair_warranty_claims")
      .insert({
        repair_id: data.repair_id,
        description: data.description,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw error;
    return claim;
  });
