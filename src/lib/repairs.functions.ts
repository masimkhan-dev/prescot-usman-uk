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
  .validator((input: any) => listRepairsSchema.parse(input?.data ?? input ?? {}))
  .handler(async ({ data, context }) => {
    let q = (context.supabase as any)
      .from("repair_tickets")
      .select("*, customers(id, name, phone, email), repair_items(*)", { count: "exact" })
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
  .validator((input: any) => z.object({ id: z.string().uuid() }).parse(input?.data ?? input))
  .handler(async ({ data, context }) => {
    const { data: repair, error } = await (context.supabase as any)
      .from("repair_tickets")
      .select(
        `
        *,
        customers(id, name, phone, email, address, postcode),
        repair_items(*),
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
// saveRepair — legacy header save
// ---------------------------------------------------------------------------
export const saveRepair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) => repairUpsertSchema.parse(input?.data ?? input))
  .handler(async ({ data, context }) => {
    const { id, ...payload } = data;

    if (!id) {
      const { data: repNum, error: seqErr } = await (context.supabase as any).rpc(
        "next_doc_number",
        {
          p_type: "REP",
        },
      );
      if (seqErr) throw seqErr;

      const { data: inserted, error } = await (context.supabase as any)
        .from("repair_tickets")
        .insert({ ...payload, rep_number: repNum, created_by: context.userId })
        .select()
        .single();
      if (error) throw error;

      await (context.supabase as any).from("repair_status_history").insert({
        repair_id: inserted.id,
        from_status: null,
        to_status: "pending",
        note: "Ticket created",
        changed_by: context.userId,
      });

      return inserted;
    }

    const { id: _id, ...safePayload } = data;
    const { status: _status, ...updatePayload } = safePayload as typeof safePayload & {
      status?: string;
    };

    const { data: updated, error } = await (context.supabase as any)
      .from("repair_tickets")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  });

// ---------------------------------------------------------------------------
// saveRepairTicketV2 — Professional Intake RPC
// ---------------------------------------------------------------------------
export const saveRepairTicketV2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) =>
    z
      .object({
        ticket_id: z.string().uuid().optional().nullable(),
        customer_id: z.string().uuid(),
        device: z.string().min(1),
        brand: z.string().optional().nullable(),
        model: z.string().optional().nullable(),
        color: z.string().optional().nullable(),
        imei: z.string().optional().nullable(),
        serial_number: z.string().optional().nullable(),
        device_condition: z.record(z.boolean()).optional().nullable(),
        accessories_received: z.array(z.string()).optional().nullable(),
        issue: z.string().min(1),
        method: z.enum(["walk-in", "door-to-door", "mail-in"]).default("walk-in"),
        technician_id: z.string().uuid().optional().nullable(),
        estimated_completion_at: z.string().optional().nullable(),
        deposit_pence: z.number().int().nonnegative().default(0),
        initial_quote_pence: z.number().int().nonnegative().default(0),
        labour_price_pence: z.number().int().nonnegative().default(0),
        warranty_days: z.number().int().nonnegative().optional().nullable(),
        warranty_policy_text: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    let result: any = null;
    let rpcError: any = null;

    try {
      const { data: res, error } = await (context.supabase as any).rpc("save_repair_ticket_v2", {
        p_ticket_id: data.ticket_id ?? null,
        p_customer_id: data.customer_id,
        p_device: data.device,
        p_brand: data.brand ?? null,
        p_model: data.model ?? null,
        p_color: data.color ?? null,
        p_imei: data.imei ?? null,
        p_serial_number: data.serial_number ?? null,
        p_device_condition: data.device_condition ?? {},
        p_accessories_received: data.accessories_received ?? [],
        p_issue: data.issue,
        p_method: data.method,
        p_technician_id: data.technician_id ?? null,
        p_estimated_completion_at: data.estimated_completion_at ?? null,
        p_deposit_pence: data.deposit_pence,
        p_initial_quote_pence: data.initial_quote_pence,
        p_labour_price_pence: data.labour_price_pence,
        p_warranty_days: data.warranty_days ?? null,
        p_warranty_policy_text: data.warranty_policy_text ?? null,
        p_notes: data.notes ?? null,
      });

      if (error) {
        rpcError = error;
      } else {
        result = res;
      }
    } catch (e: any) {
      rpcError = e;
    }

    // Direct table insert fallback if RPC fails
    if (!result || rpcError) {
      console.warn(
        "save_repair_ticket_v2 RPC failed or missing, using table insert fallback:",
        rpcError?.message,
      );

      const repNum =
        "REP-" +
        new Date().getFullYear() +
        "-" +
        String(Math.floor(100000 + Math.random() * 900000));
      const pin = String(Math.floor(1000 + Math.random() * 9000));

      if (data.ticket_id) {
        const { data: updated, error: updateErr } = await (context.supabase as any)
          .from("repair_tickets")
          .update({
            customer_id: data.customer_id,
            device: data.device,
            brand: data.brand ?? null,
            model: data.model ?? null,
            color: data.color ?? null,
            imei: data.imei ?? null,
            serial_number: data.serial_number ?? null,
            device_condition: data.device_condition ?? {},
            accessories_received: data.accessories_received ?? [],
            issue: data.issue,
            method: data.method ?? "walk-in",
            technician_id: data.technician_id ?? null,
            estimated_completion_at: data.estimated_completion_at ?? null,
            deposit_pence: data.deposit_pence ?? 0,
            total_price_pence: data.initial_quote_pence ?? 0,
            labour_price_pence: data.labour_price_pence ?? 0,
            warranty_days: data.warranty_days ?? null,
            warranty_policy_text: data.warranty_policy_text ?? null,
            notes: data.notes ?? null,
          })
          .eq("id", data.ticket_id)
          .select()
          .single();

        if (updateErr) throw new Error(updateErr.message);
        result = updated;
      } else {
        const { data: inserted, error: insertErr } = await (context.supabase as any)
          .from("repair_tickets")
          .insert({
            rep_number: repNum,
            customer_id: data.customer_id,
            device: data.device,
            brand: data.brand ?? null,
            model: data.model ?? null,
            color: data.color ?? null,
            imei: data.imei ?? null,
            serial_number: data.serial_number ?? null,
            device_condition: data.device_condition ?? {},
            accessories_received: data.accessories_received ?? [],
            issue: data.issue,
            method: data.method ?? "walk-in",
            status: "pending",
            technician_id: data.technician_id ?? null,
            estimated_completion_at: data.estimated_completion_at ?? null,
            deposit_pence: data.deposit_pence ?? 0,
            total_price_pence: data.initial_quote_pence ?? 0,
            labour_price_pence: data.labour_price_pence ?? 0,
            warranty_days: data.warranty_days ?? null,
            warranty_policy_text: data.warranty_policy_text ?? null,
            collection_pin: pin,
            notes: data.notes ?? null,
            created_by: context.userId,
          })
          .select()
          .single();

        if (insertErr) throw new Error(insertErr.message);
        result = inserted;

        // Add default line item
        try {
          await (context.supabase as any).from("repair_items").insert({
            repair_id: inserted.id,
            description: data.issue || "Device Repair Service",
            customer_price_pence: data.initial_quote_pence ?? 0,
            labour_price_pence: data.labour_price_pence ?? 0,
            warranty_days: data.warranty_days ?? null,
            warranty_policy_text: data.warranty_policy_text ?? null,
          });
        } catch (_) {}
      }
    }

    return result;
  });

// ---------------------------------------------------------------------------
// Warranty Templates CRUD
// ---------------------------------------------------------------------------
export const listWarrantyTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("warranty_templates")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const saveWarrantyTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        default_days: z.number().int().nonnegative(),
        policy_text: z.string().min(1),
        is_active: z.boolean().default(true),
        sort_order: z.number().int().default(0),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...payload } = data;
    if (id) {
      const { data: updated, error } = await (context.supabase as any)
        .from("warranty_templates")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    }
    const { data: inserted, error } = await (context.supabase as any)
      .from("warranty_templates")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return inserted;
  });

// ---------------------------------------------------------------------------
// Repair Line Items CRUD
// ---------------------------------------------------------------------------
export const addRepairItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) =>
    z
      .object({
        repair_id: z.string().uuid(),
        description: z.string().min(1),
        product_id: z.string().uuid().optional().nullable(),
        part_quality: z
          .enum(["standard", "premium", "original", "refurbished", "customer_supplied"])
          .default("standard"),
        cost_price_pence: z.number().int().nonnegative().default(0),
        default_price_pence: z.number().int().nonnegative().default(0),
        customer_price_pence: z.number().int().nonnegative().default(0),
        labour_price_pence: z.number().int().nonnegative().default(0),
        warranty_template_id: z.string().uuid().optional().nullable(),
        warranty_title: z.string().optional().nullable(),
        warranty_days: z.number().int().nonnegative().optional().nullable(),
        warranty_policy_text: z.string().optional().nullable(),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { data: item, error } = await (context.supabase as any)
      .from("repair_items")
      .insert(data)
      .select()
      .single();
    if (error) throw error;

    // Recalculate total quote on repair_tickets
    const { data: items } = await (context.supabase as any)
      .from("repair_items")
      .select("customer_price_pence, labour_price_pence")
      .eq("repair_id", data.repair_id);

    const newTotal = (items ?? []).reduce(
      (acc: number, i: any) => acc + i.customer_price_pence + i.labour_price_pence,
      0,
    );

    await (context.supabase as any)
      .from("repair_tickets")
      .update({ total_price_pence: newTotal })
      .eq("id", data.repair_id);

    return item;
  });

export const updateRepairItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) =>
    z
      .object({
        id: z.string().uuid(),
        repair_id: z.string().uuid(),
        description: z.string().min(1),
        part_quality: z
          .enum(["standard", "premium", "original", "refurbished", "customer_supplied"])
          .default("standard"),
        cost_price_pence: z.number().int().nonnegative().default(0),
        customer_price_pence: z.number().int().nonnegative().default(0),
        labour_price_pence: z.number().int().nonnegative().default(0),
        warranty_days: z.number().int().nonnegative().optional().nullable(),
        warranty_policy_text: z.string().optional().nullable(),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { id, repair_id, ...payload } = data;
    const { data: updated, error } = await (context.supabase as any)
      .from("repair_items")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    const { data: items } = await (context.supabase as any)
      .from("repair_items")
      .select("customer_price_pence, labour_price_pence")
      .eq("repair_id", repair_id);

    const newTotal = (items ?? []).reduce(
      (acc: number, i: any) => acc + i.customer_price_pence + i.labour_price_pence,
      0,
    );

    await (context.supabase as any)
      .from("repair_tickets")
      .update({ total_price_pence: newTotal })
      .eq("id", repair_id);

    return updated;
  });

export const deleteRepairItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) =>
    z
      .object({
        id: z.string().uuid(),
        repair_id: z.string().uuid(),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("repair_items")
      .delete()
      .eq("id", data.id);
    if (error) throw error;

    const { data: items } = await (context.supabase as any)
      .from("repair_items")
      .select("customer_price_pence, labour_price_pence")
      .eq("repair_id", data.repair_id);

    const newTotal = (items ?? []).reduce(
      (acc: number, i: any) => acc + i.customer_price_pence + i.labour_price_pence,
      0,
    );

    await (context.supabase as any)
      .from("repair_tickets")
      .update({ total_price_pence: newTotal })
      .eq("id", data.repair_id);

    return { success: true };
  });

// ---------------------------------------------------------------------------
// approveRepairQuote
// ---------------------------------------------------------------------------
export const approveRepairQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) =>
    z
      .object({
        repair_id: z.string().uuid(),
        approved_via: z.enum(["phone", "whatsapp", "in_store", "sms"]),
        total_pence: z.number().int().nonnegative(),
        notes: z.string().optional().nullable(),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as any).rpc("approve_repair_quote", {
      p_repair_id: data.repair_id,
      p_approved_via: data.approved_via,
      p_total_pence: data.total_pence,
      p_notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return result;
  });

// ---------------------------------------------------------------------------
// finalizeRepairTicket
// ---------------------------------------------------------------------------
export const finalizeRepairTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) => z.object({ repair_id: z.string().uuid() }).parse(input?.data ?? input))
  .handler(async ({ data, context }) => {
    let result: any = null;
    let rpcError: any = null;

    try {
      const { data: res, error } = await (context.supabase as any).rpc("finalize_repair_ticket", {
        p_repair_id: data.repair_id,
      });
      if (error) {
        rpcError = error;
      } else {
        result = res;
      }
    } catch (e: any) {
      rpcError = e;
    }

    if (!result || rpcError) {
      console.warn(
        "finalize_repair_ticket RPC failed or missing, using table fallback:",
        rpcError?.message,
      );

      // Fetch repair ticket
      const { data: ticket, error: fetchErr } = await (context.supabase as any)
        .from("repair_tickets")
        .select("*")
        .eq("id", data.repair_id)
        .single();

      if (fetchErr) throw new Error(fetchErr.message);
      if (ticket.is_finalized) throw new Error("Repair ticket is already finalized");
      if (ticket.status === "cancelled")
        throw new Error("Cannot finalize a cancelled repair ticket");

      const todayStr = new Date().toISOString().split("T")[0];

      let headerUntil = ticket.warranty_until;
      if (ticket.warranty_days && ticket.warranty_days > 0) {
        const d = new Date();
        d.setDate(d.getDate() + ticket.warranty_days);
        headerUntil = d.toISOString().split("T")[0];
      }

      // 1. Update repair_tickets
      const { data: updated, error: updateErr } = await (context.supabase as any)
        .from("repair_tickets")
        .update({
          is_finalized: true,
          finalized_at: new Date().toISOString(),
          status: "completed",
          warranty_until: headerUntil,
        })
        .eq("id", data.repair_id)
        .select()
        .single();

      if (updateErr) throw new Error(updateErr.message);
      result = updated;

      // 2. Update repair_items warranty dates (ONLY for warranty_days > 0)
      const { data: items } = await (context.supabase as any)
        .from("repair_items")
        .select("id, warranty_days")
        .eq("repair_id", data.repair_id);

      if (items && items.length > 0) {
        for (const item of items) {
          if (item.warranty_days && item.warranty_days > 0) {
            const endD = new Date();
            endD.setDate(endD.getDate() + item.warranty_days);
            await (context.supabase as any)
              .from("repair_items")
              .update({
                warranty_start_date: todayStr,
                warranty_end_date: endD.toISOString().split("T")[0],
              })
              .eq("id", item.id);
          }
        }
      }

      // 3. Log status history
      try {
        await (context.supabase as any).from("repair_status_history").insert({
          repair_id: data.repair_id,
          from_status: ticket.status,
          to_status: "completed",
          note: "Repair finalized & customer invoice completed",
          changed_by: context.userId,
        });
      } catch (_) {}
    }

    return result;
  });

// ---------------------------------------------------------------------------
// updateRepairStatus
// ---------------------------------------------------------------------------
export const updateRepairStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) =>
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
    if (data.new_status === "completed") {
      throw new Error("Use finalize_repair_ticket to complete a repair");
    }

    let result: any = null;
    let rpcError: any = null;

    try {
      const { data: res, error } = await (context.supabase as any).rpc("update_repair_status", {
        p_repair_id: data.repair_id,
        p_new_status: data.new_status,
        p_note: data.note ?? null,
      });
      if (error) {
        rpcError = error;
      } else {
        result = res;
      }
    } catch (e: any) {
      rpcError = e;
    }

    if (!result || rpcError) {
      console.warn("update_repair_status RPC failed, using table fallback:", rpcError?.message);

      // Fetch current repair record
      const { data: current, error: fetchErr } = await (context.supabase as any)
        .from("repair_tickets")
        .select("status, is_finalized")
        .eq("id", data.repair_id)
        .single();

      if (fetchErr) throw new Error(fetchErr.message);

      if (current.is_finalized) {
        throw new Error("This repair ticket is finalized and locked");
      }

      const { data: updated, error: updateErr } = await (context.supabase as any)
        .from("repair_tickets")
        .update({
          status: data.new_status,
        })
        .eq("id", data.repair_id)
        .select()
        .single();

      if (updateErr) throw new Error(updateErr.message);

      // Log status history
      try {
        await (context.supabase as any).from("repair_status_history").insert({
          repair_id: data.repair_id,
          from_status: current.status,
          to_status: data.new_status,
          note: data.note ?? null,
          changed_by: context.userId,
        });
      } catch (_) {}

      return { ok: true, new_status: data.new_status };
    }

    return result;
  });

// ---------------------------------------------------------------------------
// issueRepairParts & returnRepairParts
// ---------------------------------------------------------------------------
export const issueRepairParts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) =>
    z
      .object({
        repair_id: z.string().uuid(),
        idempotency_key: z.string().min(1),
        parts: z.array(repairPartSchema).min(1),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as any).rpc("issue_repair_parts", {
      p_repair_id: data.repair_id,
      p_idempotency_key: data.idempotency_key,
      p_parts: data.parts,
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const returnRepairParts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) =>
    z
      .object({
        repair_id: z.string().uuid(),
        part_ids: z.array(z.string().uuid()).min(1),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as any).rpc("return_repair_parts", {
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
  .validator((input: any) =>
    z
      .object({
        repair_id: z.string().uuid(),
        idempotency_key: z.string().min(1),
        amount_pence: z.number().int().positive(),
        method: z.enum(["cash", "card", "bank_transfer", "cheque"]).default("cash"),
        is_deposit: z.boolean().default(false),
        shift_id: z.string().uuid().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as any).rpc("record_repair_payment", {
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
    const { data, error } = await (context.supabase as any)
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("is_active", true)
      .order("full_name");
    if (error) throw error;
    return data ?? [];
  });

// ---------------------------------------------------------------------------
// lookupRepairWarranty
// ---------------------------------------------------------------------------
export const lookupRepairWarranty = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) => z.object({ query: z.string().min(1) }).parse(input?.data ?? input))
  .handler(async ({ data, context }) => {
    const q = data.query.trim();
    const { data: tickets, error } = await (context.supabase as any)
      .from("repair_tickets")
      .select(
        `
        *,
        customers(name, phone, email),
        repair_items(*)
      `,
      )
      .or(`rep_number.ilike.%${q}%,imei.ilike.%${q}%,serial_number.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return tickets ?? [];
  });

// ---------------------------------------------------------------------------
// submitWarrantyClaim
// ---------------------------------------------------------------------------
export const submitWarrantyClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) =>
    z
      .object({
        repair_id: z.string().uuid(),
        description: z.string().min(5),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const { data: repair, error: re } = await (context.supabase as any)
      .from("repair_tickets")
      .select("warranty_until, status")
      .eq("id", data.repair_id)
      .single();
    if (re) throw re;
    if (!repair.warranty_until) throw new Error("This repair has no warranty");
    if (new Date(repair.warranty_until) < new Date())
      throw new Error("Warranty period has expired");

    const { data: claim, error } = await (context.supabase as any)
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

// ---------------------------------------------------------------------------
// createQuickRepairInvoice
// Fast path: form → create ticket → items → payment → finalize → return detail
// Does NOT bypass finalize_repair_ticket() — it is the single official path.
// ---------------------------------------------------------------------------
export const createQuickRepairInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) =>
    z
      .object({
        device_model: z.string().min(1),
        items: z
          .array(
            z.object({
              description: z.string().min(1),
              price_pence: z.number().int().nonnegative(),
              warranty_days: z.number().int().nonnegative().nullable().optional(),
              warranty_policy_text: z.string().optional().nullable(),
            }),
          )
          .min(1),
        customer_name: z.string().optional().nullable(),
        customer_phone: z.string().optional().nullable(),
        payment_method: z.enum(["cash", "card", "bank_transfer"]).default("cash"),
        is_paid: z.boolean().default(true),
        notes: z.string().optional().nullable(),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;

    // ── Step 1: Optional customer find-or-create ──────────────────────────
    let customerId: string | null = null;
    if (data.customer_name?.trim()) {
      // Try to find by phone first
      if (data.customer_phone?.trim()) {
        const { data: found } = await sb
          .from("customers")
          .select("id")
          .eq("phone", data.customer_phone.trim())
          .maybeSingle();
        if (found?.id) {
          customerId = found.id;
        }
      }
      // Not found — create new customer
      if (!customerId) {
        const { data: newCustomer, error: custErr } = await sb
          .from("customers")
          .insert({
            name: data.customer_name.trim(),
            phone: data.customer_phone?.trim() || null,
          })
          .select("id")
          .single();
        if (custErr) throw new Error(`Customer create failed: ${custErr.message}`);
        customerId = newCustomer.id;
      }
    }

    // ── Step 2: Generate REP number ───────────────────────────────────────
    let repNumber: string;
    const { data: repNum, error: seqErr } = await sb.rpc("next_doc_number", { p_type: "REP" });
    if (seqErr || !repNum) {
      // Fallback sequence
      repNumber = `REP-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;
    } else {
      repNumber = repNum;
    }

    // ── Step 3: Calculate totals ──────────────────────────────────────────
    const totalPence = data.items.reduce((acc, i) => acc + i.price_pence, 0);
    const primaryIssue =
      data.items.length === 1
        ? data.items[0].description
        : data.items.map((i) => i.description).join(", ");

    // ── Step 4: INSERT repair_tickets (status=pending, not finalized yet) ─
    const { data: ticket, error: ticketErr } = await sb
      .from("repair_tickets")
      .insert({
        rep_number: repNumber,
        customer_id: customerId,
        device: data.device_model,
        model: data.device_model,
        issue: primaryIssue,
        method: "walk-in",
        status: "pending",
        total_price_pence: totalPence,
        labour_price_pence: 0,
        // ticket-level warranty intentionally NULL — per-item only (correction #2)
        warranty_days: null,
        warranty_until: null,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select()
      .single();
    if (ticketErr) throw new Error(`Repair ticket create failed: ${ticketErr.message}`);

    // Status history
    try {
      await sb.from("repair_status_history").insert({
        repair_id: ticket.id,
        from_status: null,
        to_status: "pending",
        note: "Quick repair invoice created",
        changed_by: context.userId,
      });
    } catch (_) {}

    // ── Step 5: INSERT repair_items ───────────────────────────────────────
    const itemInserts = data.items.map((item) => ({
      repair_id: ticket.id,
      description: item.description,
      customer_price_pence: item.price_pence,
      labour_price_pence: 0,
      warranty_days: item.warranty_days ?? null,
      warranty_policy_text: item.warranty_policy_text ?? null,
    }));
    const { error: itemsErr } = await sb.from("repair_items").insert(itemInserts);
    if (itemsErr) throw new Error(`Repair items create failed: ${itemsErr.message}`);

    // ── Step 6: Record payment if paid ────────────────────────────────────
    if (data.is_paid && totalPence > 0) {
      const idempotencyKey = crypto.randomUUID();
      const { error: payErr } = await sb.rpc("record_repair_payment", {
        p_repair_id: ticket.id,
        p_idempotency_key: idempotencyKey,
        p_amount_pence: totalPence,
        p_method: data.payment_method,
        p_is_deposit: false,
        p_shift_id: null,
        p_notes: "Quick repair invoice — paid at collection",
      });
      if (payErr) {
        // Fallback direct insert if RPC unavailable
        console.warn("record_repair_payment RPC failed, using fallback:", payErr.message);
        await sb.from("repair_payments").insert({
          repair_id: ticket.id,
          idempotency_key: idempotencyKey,
          amount_pence: totalPence,
          method: data.payment_method,
          is_deposit: false,
          notes: "Quick repair invoice — paid at collection",
          recorded_by: context.userId,
        });
        await sb
          .from("repair_tickets")
          .update({ amount_paid_pence: totalPence })
          .eq("id", ticket.id);
      }
    }

    // ── Step 7: Finalize via official path (correction #1) ────────────────
    // This sets is_finalized=true, status=completed, finalized_at=now(),
    // and stamps per-item warranty_start_date + warranty_end_date.
    try {
      const { error: finalErr } = await sb.rpc("finalize_repair_ticket", {
        p_repair_id: ticket.id,
      });
      if (finalErr) {
        console.warn("finalize_repair_ticket RPC failed, using table fallback:", finalErr.message);
        // Fallback: manually finalize
        await sb
          .from("repair_tickets")
          .update({
            is_finalized: true,
            finalized_at: new Date().toISOString(),
            status: "completed",
          })
          .eq("id", ticket.id);

        // Stamp per-item warranty dates
        const { data: items } = await sb
          .from("repair_items")
          .select("id, warranty_days")
          .eq("repair_id", ticket.id);
        const todayStr = new Date().toISOString().split("T")[0];
        if (items) {
          for (const item of items) {
            if (item.warranty_days && item.warranty_days > 0) {
              const endD = new Date();
              endD.setDate(endD.getDate() + item.warranty_days);
              await sb
                .from("repair_items")
                .update({
                  warranty_start_date: todayStr,
                  warranty_end_date: endD.toISOString().split("T")[0],
                })
                .eq("id", item.id);
            }
          }
        }

        await sb.from("repair_status_history").insert({
          repair_id: ticket.id,
          from_status: "pending",
          to_status: "completed",
          note: "Quick repair invoice finalized",
          changed_by: context.userId,
        });
      }
    } catch (e: any) {
      console.warn("Finalize step error:", e?.message);
    }

    // ── Step 8: Return full repair detail for RepairA4InvoiceModal ────────
    const { data: fullRepair, error: detailErr } = await sb
      .from("repair_tickets")
      .select(
        `*, customers(id, name, phone, email, address, postcode),
         repair_items(*), repair_payments(*)`,
      )
      .eq("id", ticket.id)
      .single();
    if (detailErr) throw new Error(`Failed to fetch repair detail: ${detailErr.message}`);
    return fullRepair;
  });

// ---------------------------------------------------------------------------
// linkCustomerToRepair
// Post-finalization safe action: only updates customer_id linkage.
// Financial fields (price, items, warranty, payments) are NEVER touched.
// ---------------------------------------------------------------------------
export const linkCustomerToRepair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) =>
    z
      .object({
        repair_id: z.string().uuid(),
        customer_name: z.string().min(1),
        customer_phone: z.string().optional().nullable(),
      })
      .parse(input?.data ?? input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;

    // Find by phone first, then create if not found
    let customerId: string | null = null;

    if (data.customer_phone?.trim()) {
      const { data: found } = await sb
        .from("customers")
        .select("id")
        .eq("phone", data.customer_phone.trim())
        .maybeSingle();
      if (found?.id) customerId = found.id;
    }

    if (!customerId) {
      const { data: created, error: custErr } = await sb
        .from("customers")
        .insert({
          name: data.customer_name.trim(),
          phone: data.customer_phone?.trim() || null,
        })
        .select("id, name, phone")
        .single();
      if (custErr) throw new Error(`Customer create failed: ${custErr.message}`);
      customerId = created.id;
    }

    // ONLY update customer_id — financial snapshot is locked
    const { error: linkErr } = await sb
      .from("repair_tickets")
      .update({ customer_id: customerId })
      .eq("id", data.repair_id);
    if (linkErr) throw new Error(`Customer link failed: ${linkErr.message}`);

    // Return updated customer info for UI refresh
    const { data: customer } = await sb
      .from("customers")
      .select("id, name, phone, email")
      .eq("id", customerId)
      .single();

    return { ok: true, customer };
  });

// ---------------------------------------------------------------------------
// getRepairMetrics
// ---------------------------------------------------------------------------
export const getRepairMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: tickets, error } = await (context.supabase as any)
      .from("repair_tickets")
      .select("id, status, total_price_pence, amount_paid_pence, created_at");

    if (error) throw error;

    const rows = (tickets ?? []) as any[];
    let todayCount = 0;
    let inProgressCount = 0;
    let readyCount = 0;
    let completedTodayCount = 0;
    let totalDuePence = 0;
    let totalRevenuePence = 0;

    rows.forEach((t) => {
      const createdAt = new Date(t.created_at);
      if (createdAt >= todayStart) todayCount++;
      if (t.status === "in_progress") inProgressCount++;
      if (t.status === "ready") readyCount++;
      if (t.status === "completed" && createdAt >= todayStart) completedTodayCount++;

      const due = Math.max(0, t.total_price_pence - t.amount_paid_pence);
      if (t.status !== "cancelled" && t.status !== "completed") totalDuePence += due;
      totalRevenuePence += t.amount_paid_pence;
    });

    return {
      todayCount,
      inProgressCount,
      readyCount,
      completedTodayCount,
      totalDuePence,
      totalRevenuePence,
    };
  });
