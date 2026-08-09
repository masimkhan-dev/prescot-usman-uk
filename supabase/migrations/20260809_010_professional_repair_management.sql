-- ============================================================================
-- MIGRATION 20260809_010: Professional Repair Management System Upgrade
-- ============================================================================

-- 1. Create warranty_templates table
CREATE TABLE IF NOT EXISTS public.warranty_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  default_days integer NOT NULL DEFAULT 90 CHECK (default_days >= 0),
  policy_text  text NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.warranty_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.warranty_templates TO authenticated;
GRANT ALL ON public.warranty_templates TO service_role;

CREATE TRIGGER warranty_templates_updated_at
  BEFORE UPDATE ON public.warranty_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "warranty_templates_read"
  ON public.warranty_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "warranty_templates_admin_write"
  ON public.warranty_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed Default Warranty Templates
INSERT INTO public.warranty_templates (name, default_days, policy_text, sort_order)
VALUES
  (
    'Standard Screen',
    90,
    'Covers replacement component manufacturing defects and repair workmanship. Excludes physical damage, cracked glass, impact, liquid, or pressure damage.',
    1
  ),
  (
    'Premium Screen',
    180,
    'Covers premium OLED/LCD replacement component manufacturing defects and installation workmanship for 180 days. Physical/impact/liquid damage excluded.',
    2
  ),
  (
    'Original / Genuine Screen',
    365,
    'Full 12-month (365 days) coverage for genuine/original service unit display assembly. Covers manufacturing defects and touch responsiveness. Physical or liquid damage excluded.',
    3
  ),
  (
    'Battery Replacement',
    90,
    'Covers replacement battery capacity retention and power management manufacturing defects. Excludes degradation caused by third-party chargers, liquid exposure, or physical puncture.',
    4
  ),
  (
    'Charging Port Repair',
    90,
    'Covers charging flex assembly and port soldering workmanship. Excludes damage caused by forced cable insertion, debris build-up, or liquid ingress.',
    5
  ),
  (
    'Camera Replacement',
    90,
    'Covers rear/front camera module focus mechanism and sensor functionality. Excludes lens glass cracks caused by drops or laser/sun sensor burn.',
    6
  ),
  (
    'Logic Board Repair',
    30,
    'Covers microsoldering and chip replacement specified in work order. Warranty applies strictly to repaired circuit path for 30 days.',
    7
  ),
  (
    'Liquid Damage Treatment',
    0,
    'Liquid damage clean & diagnostic service provided without warranty. Chemical treatment attempts stabilization; subsequent component failures are not covered.',
    8
  ),
  (
    'Customer Supplied Part',
    90,
    'Covers installation workmanship only for 90 days. The customer-supplied component itself carries no warranty from Prescot Mobiles.',
    9
  )
ON CONFLICT (name) DO UPDATE SET
  default_days = EXCLUDED.default_days,
  policy_text = EXCLUDED.policy_text;

-- 2. Extend customers table with marketing consent & postcode
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS marketing_consent_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_sms      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_email    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_updated_at         timestamptz,
  ADD COLUMN IF NOT EXISTS postcode                   text;

-- 3. Extend repair_tickets table with collection_pin, condition, quote approval & warranty policy snapshot
ALTER TABLE public.repair_tickets
  ADD COLUMN IF NOT EXISTS collection_pin            text,
  ADD COLUMN IF NOT EXISTS color                     text,
  ADD COLUMN IF NOT EXISTS estimated_completion_at   timestamptz,
  ADD COLUMN IF NOT EXISTS device_condition          jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS accessories_received      text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS warranty_policy_text      text,
  ADD COLUMN IF NOT EXISTS quote_approved            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_via              text CHECK (approved_via IN ('phone','whatsapp','in_store','sms')),
  ADD COLUMN IF NOT EXISTS approved_price_pence      bigint CHECK (approved_price_pence >= 0),
  ADD COLUMN IF NOT EXISTS approved_at               timestamptz,
  ADD COLUMN IF NOT EXISTS approval_notes            text,
  ADD COLUMN IF NOT EXISTS is_finalized              boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS finalized_at              timestamptz;

-- 4. Create repair_items table (multi-item per repair with line-by-line pricing & warranty snapshot)
CREATE TABLE IF NOT EXISTS public.repair_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id             uuid NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  description           text NOT NULL,
  product_id            uuid REFERENCES public.products(id) ON DELETE SET NULL,
  part_quality          text NOT NULL DEFAULT 'standard'
                          CHECK (part_quality IN ('standard','premium','original','refurbished','customer_supplied')),
  cost_price_pence      bigint NOT NULL DEFAULT 0 CHECK (cost_price_pence >= 0),
  default_price_pence   bigint NOT NULL DEFAULT 0 CHECK (default_price_pence >= 0),
  customer_price_pence  bigint NOT NULL DEFAULT 0 CHECK (customer_price_pence >= 0),
  labour_price_pence    bigint NOT NULL DEFAULT 0 CHECK (labour_price_pence >= 0),
  warranty_template_id  uuid REFERENCES public.warranty_templates(id) ON DELETE SET NULL,
  warranty_title        text,
  warranty_days         integer NOT NULL DEFAULT 90 CHECK (warranty_days >= 0),
  warranty_policy_text  text,
  warranty_start_date   date,
  warranty_end_date     date,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.repair_items TO authenticated;
GRANT ALL ON public.repair_items TO service_role;

CREATE TRIGGER repair_items_updated_at
  BEFORE UPDATE ON public.repair_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_repair_items_repair ON public.repair_items(repair_id);

CREATE POLICY "repair_items_read"
  ON public.repair_items FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff') OR
    public.has_role(auth.uid(), 'technician')
  );

CREATE POLICY "repair_items_write"
  ON public.repair_items FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff') OR
    public.has_role(auth.uid(), 'technician')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff') OR
    public.has_role(auth.uid(), 'technician')
  );

-- 5. RPC Functions

-- Save/Book Repair Ticket V2
CREATE OR REPLACE FUNCTION public.save_repair_ticket_v2(
  p_ticket_id               uuid,
  p_customer_id             uuid,
  p_device                  text,
  p_brand                   text,
  p_model                   text,
  p_color                   text,
  p_imei                    text,
  p_serial_number           text,
  p_device_condition        jsonb,
  p_accessories_received    text[],
  p_issue                   text,
  p_method                  text,
  p_technician_id           uuid,
  p_estimated_completion_at timestamptz,
  p_deposit_pence           bigint,
  p_initial_quote_pence     bigint,
  p_labour_price_pence      bigint,
  p_warranty_days           integer,
  p_warranty_policy_text    text,
  p_notes                   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_ticket    public.repair_tickets%ROWTYPE;
  v_rep_num   text;
  v_pin       text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer selection is mandatory for repair booking';
  END IF;

  IF p_ticket_id IS NOT NULL THEN
    -- Update existing ticket
    SELECT * INTO v_ticket FROM public.repair_tickets WHERE id = p_ticket_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Repair ticket not found';
    END IF;

    IF v_ticket.is_finalized THEN
      RAISE EXCEPTION 'This repair ticket has been finalized and locked';
    END IF;

    UPDATE public.repair_tickets SET
      customer_id             = p_customer_id,
      device                  = p_device,
      brand                   = p_brand,
      model                   = p_model,
      color                   = p_color,
      imei                    = p_imei,
      serial_number           = p_serial_number,
      device_condition        = COALESCE(p_device_condition, '{}'::jsonb),
      accessories_received    = COALESCE(p_accessories_received, '{}'::text[]),
      issue                   = p_issue,
      method                  = COALESCE(p_method, 'walk-in'),
      technician_id           = p_technician_id,
      estimated_completion_at = p_estimated_completion_at,
      deposit_pence           = COALESCE(p_deposit_pence, 0),
      total_price_pence       = COALESCE(p_initial_quote_pence, 0),
      labour_price_pence      = COALESCE(p_labour_price_pence, 0),
      warranty_days           = p_warranty_days,
      warranty_policy_text    = p_warranty_policy_text,
      notes                   = p_notes
    WHERE id = p_ticket_id
    RETURNING * INTO v_ticket;
  ELSE
    -- Generate REP number
    v_rep_num := 'REP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.repair_seq')::text, 6, '0');
    -- Generate 4-digit collection PIN
    v_pin := lpad(floor(random() * 9000 + 1000)::text, 4, '0');

    INSERT INTO public.repair_tickets (
      rep_number,
      customer_id,
      technician_id,
      device,
      brand,
      model,
      color,
      imei,
      serial_number,
      device_condition,
      accessories_received,
      issue,
      method,
      status,
      labour_price_pence,
      total_price_pence,
      deposit_pence,
      warranty_days,
      warranty_policy_text,
      collection_pin,
      notes,
      created_by
    ) VALUES (
      v_rep_num,
      p_customer_id,
      p_technician_id,
      p_device,
      p_brand,
      p_model,
      p_color,
      p_imei,
      p_serial_number,
      COALESCE(p_device_condition, '{}'::jsonb),
      COALESCE(p_accessories_received, '{}'::text[]),
      p_issue,
      COALESCE(p_method, 'walk-in'),
      'pending',
      COALESCE(p_labour_price_pence, 0),
      COALESCE(p_initial_quote_pence, 0),
      COALESCE(p_deposit_pence, 0),
      p_warranty_days,
      p_warranty_policy_text,
      v_pin,
      p_notes,
      v_caller_id
    )
    RETURNING * INTO v_ticket;

    -- Add default initial repair item line
    INSERT INTO public.repair_items (
      repair_id,
      description,
      customer_price_pence,
      labour_price_pence,
      warranty_days,
      warranty_policy_text
    ) VALUES (
      v_ticket.id,
      COALESCE(p_issue, 'Device Repair Service'),
      COALESCE(p_initial_quote_pence, 0),
      COALESCE(p_labour_price_pence, 0),
      COALESCE(p_warranty_days, 90),
      p_warranty_policy_text
    );

    -- Log status history
    INSERT INTO public.repair_status_history (repair_id, to_status, note, changed_by)
    VALUES (v_ticket.id, 'pending', 'Repair ticket booked', v_caller_id);
  END IF;

  RETURN to_jsonb(v_ticket);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_repair_ticket_v2 TO authenticated;

-- Record Customer Quote Approval
CREATE OR REPLACE FUNCTION public.approve_repair_quote(
  p_repair_id    uuid,
  p_approved_via text,
  p_total_pence  bigint,
  p_notes        text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_ticket    public.repair_tickets%ROWTYPE;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_ticket FROM public.repair_tickets WHERE id = p_repair_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repair ticket not found';
  END IF;

  IF v_ticket.is_finalized THEN
    RAISE EXCEPTION 'Cannot modify quote on a finalized repair ticket';
  END IF;

  UPDATE public.repair_tickets SET
    quote_approved       = true,
    approved_via         = p_approved_via,
    approved_price_pence = p_total_pence,
    total_price_pence    = p_total_pence,
    approved_at          = now(),
    approval_notes       = p_notes
  WHERE id = p_repair_id
  RETURNING * INTO v_ticket;

  INSERT INTO public.repair_status_history (repair_id, from_status, to_status, note, changed_by)
  VALUES (p_repair_id, v_ticket.status, v_ticket.status, 'Quote approved via ' || p_approved_via || ' for £' || (p_total_pence::numeric / 100)::text, v_caller_id);

  RETURN to_jsonb(v_ticket);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_repair_quote TO authenticated;

-- Finalize Repair Ticket
CREATE OR REPLACE FUNCTION public.finalize_repair_ticket(
  p_repair_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id  uuid := auth.uid();
  v_ticket     public.repair_tickets%ROWTYPE;
  v_old_status public.repair_status;
  v_start      date := CURRENT_DATE;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 1. Lock and fetch existing ticket BEFORE update to capture old status
  SELECT * INTO v_ticket FROM public.repair_tickets WHERE id = p_repair_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repair ticket not found';
  END IF;

  IF v_ticket.is_finalized THEN
    RAISE EXCEPTION 'Repair ticket is already finalized';
  END IF;

  IF v_ticket.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot finalize a cancelled repair ticket';
  END IF;

  -- Capture true previous status before updating
  v_old_status := v_ticket.status;

  -- 2. Execute finalization & status completion
  UPDATE public.repair_tickets SET
    is_finalized   = true,
    finalized_at   = now(),
    status         = 'completed',
    warranty_until = COALESCE(warranty_until, v_start + (COALESCE(warranty_days, 90) || ' days')::interval)
  WHERE id = p_repair_id
  RETURNING * INTO v_ticket;

  -- 3. Set line item warranty start & end dates
  UPDATE public.repair_items SET
    warranty_start_date = COALESCE(warranty_start_date, v_start),
    warranty_end_date   = COALESCE(warranty_end_date, v_start + (warranty_days || ' days')::interval)
  WHERE repair_id = p_repair_id;

  -- 4. Record status history with correct from_status (e.g. 'ready' -> 'completed')
  IF v_old_status IS DISTINCT FROM 'completed' THEN
    INSERT INTO public.repair_status_history (repair_id, from_status, to_status, note, changed_by)
    VALUES (p_repair_id, v_old_status, 'completed', 'Repair finalized & customer invoice completed', v_caller_id);
  END IF;

  RETURN to_jsonb(v_ticket);
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_repair_ticket TO authenticated;

-- Flexible Update Repair Status RPC
CREATE OR REPLACE FUNCTION public.update_repair_status(
  p_repair_id  uuid,
  p_new_status public.repair_status,
  p_note       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id    uuid := auth.uid();
  v_repair       public.repair_tickets%ROWTYPE;
  v_warranty_days integer;
  v_warranty_until date;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_repair FROM public.repair_tickets WHERE id = p_repair_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Repair ticket not found'; END IF;

  IF v_repair.is_finalized AND p_new_status != 'completed' THEN
    RAISE EXCEPTION 'This repair ticket is finalized and locked';
  END IF;

  -- Set warranty_until once on first completion/ready (never reset)
  IF p_new_status IN ('ready','completed') AND v_repair.warranty_until IS NULL THEN
    v_warranty_days := COALESCE(v_repair.warranty_days, 90);
    IF v_warranty_days > 0 THEN
      v_warranty_until := CURRENT_DATE + (v_warranty_days || ' days')::interval;
    END IF;
  ELSE
    v_warranty_until := v_repair.warranty_until;
  END IF;

  UPDATE public.repair_tickets
  SET
    status = p_new_status,
    warranty_until = COALESCE(v_warranty_until, warranty_until),
    is_finalized = CASE WHEN p_new_status = 'completed' THEN true ELSE is_finalized END,
    finalized_at = CASE WHEN p_new_status = 'completed' THEN COALESCE(finalized_at, now()) ELSE finalized_at END
  WHERE id = p_repair_id;

  INSERT INTO public.repair_status_history (repair_id, from_status, to_status, note, changed_by)
  VALUES (p_repair_id, v_repair.status, p_new_status, p_note, v_caller_id);

  -- If cancelled, return parts automatically
  IF p_new_status = 'cancelled' THEN
    PERFORM public.return_repair_parts(
      p_repair_id,
      ARRAY(SELECT id FROM public.repair_parts WHERE repair_id = p_repair_id AND is_returned = false)
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'new_status', p_new_status, 'warranty_until', v_warranty_until);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_repair_status TO authenticated;
