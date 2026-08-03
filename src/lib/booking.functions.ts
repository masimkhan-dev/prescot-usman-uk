import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const bookingSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^[0-9+\-\s()]{7,20}$/, "Invalid phone number"),
  email: z.string().email().optional().nullable().or(z.literal("")),
  device: z.string().min(2).max(100),
  brand: z.string().max(60).optional().nullable(),
  issue: z.string().min(5).max(2000),
  method: z.enum(["walk-in", "door-to-door", "mail-in"]).default("walk-in"),
  preferred_date: z.string().optional().nullable(),
  preferred_slot: z.enum(["morning", "afternoon", "evening"]).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
});

// Public booking enquiry — uses anon key (no auth required)
export const submitBookingEnquiry = createServerFn({ method: "POST" })
  .inputValidator((input) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
    );

    const { data: row, error } = await supabase
      .from("booking_enquiries")
      .insert({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        device: data.device,
        brand: data.brand || null,
        issue: data.issue,
        method: data.method,
        preferred_date: data.preferred_date || null,
        preferred_slot: data.preferred_slot || null,
        address: data.address || null,
        status: "new",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });
