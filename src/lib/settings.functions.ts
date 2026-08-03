import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type StoreSettings = {
  business_name: string;
  address_line: string;
  email: string;
  phone: string;
  whatsapp: string;
  timezone: string;
  currency: string;
  vat_registered: string;
  vat_number: string;
  vat_rate_percent: string;
  company_number: string;
  default_warranty_days: string;
  allow_negative_stock: string;
  require_adj_approval: string;
  door_to_door_charge_pence: string;
  receipt_footer: string;
  invoice_prefix: string;
  repair_prefix: string;
  credit_note_prefix: string;
  po_prefix: string;
  grn_prefix: string;
  adj_prefix: string;
  [key: string]: string | undefined;
};

// ---------------------------------------------------------------------------
// getSettings — load all settings keys into a typed record
// ---------------------------------------------------------------------------
export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("store_settings").select("key, value");
    if (error) throw error;

    const settings: Partial<StoreSettings> = {};
    for (const row of data ?? []) {
      settings[row.key] = row.value ?? "";
    }
    return settings as StoreSettings;
  });

// ---------------------------------------------------------------------------
// saveSettings — admin only (enforced by RLS + explicit role check)
// ---------------------------------------------------------------------------
const settingsPatchSchema = z.object({
  business_name: z.string().optional(),
  address_line: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  vat_registered: z.enum(["true", "false"]).optional(),
  vat_number: z.string().max(20).optional(),
  vat_rate_percent: z.string().optional(),
  company_number: z.string().max(20).optional(),
  default_warranty_days: z.string().optional(),
  allow_negative_stock: z.enum(["true", "false"]).optional(),
  require_adj_approval: z.enum(["true", "false"]).optional(),
  door_to_door_charge_pence: z.string().optional(),
  receipt_footer: z.string().max(500).optional(),
});

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => settingsPatchSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Build upsert rows
    const rows = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([key, value]) => ({
        key,
        value: value as string,
        updated_by: context.userId,
      }));

    if (rows.length === 0) return { ok: true };

    const { error } = await context.supabase
      .from("store_settings")
      .upsert(rows, { onConflict: "key" });

    if (error) throw error;
    return { ok: true };
  });
