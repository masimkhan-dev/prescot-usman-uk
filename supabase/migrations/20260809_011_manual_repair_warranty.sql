-- ============================================================================
-- MIGRATION 20260809_011: Remove Artificial Warranty Defaults & Support Manual Warranty
-- ============================================================================

-- 1. Make warranty_days nullable on repair_items and drop default 90
ALTER TABLE public.repair_items
  ALTER COLUMN warranty_days DROP DEFAULT,
  ALTER COLUMN warranty_days DROP NOT NULL;

-- 2. Make warranty_days nullable on repair_tickets and drop default 90 if present
ALTER TABLE public.repair_tickets
  ALTER COLUMN warranty_days DROP DEFAULT,
  ALTER COLUMN warranty_days DROP NOT NULL;

-- 3. Update save_repair_ticket_v2 RPC to preserve manual/NULL warranty values
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

    -- Add default initial repair item line with EXACT manual warranty (no fallback 90)
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
      p_warranty_days,
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

-- 4. Update finalize_repair_ticket RPC to set start/end dates ONLY when warranty_days > 0
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

  v_old_status := v_ticket.status;

  -- Set ticket header warranty_until ONLY if warranty_days is valid
  UPDATE public.repair_tickets SET
    is_finalized   = true,
    finalized_at   = now(),
    status         = 'completed',
    warranty_until = CASE
                       WHEN warranty_days IS NOT NULL AND warranty_days > 0 THEN v_start + (warranty_days || ' days')::interval
                       ELSE warranty_until
                     END
  WHERE id = p_repair_id
  RETURNING * INTO v_ticket;

  -- Set line item warranty start/end dates ONLY for items with valid warranty_days
  UPDATE public.repair_items SET
    warranty_start_date = CASE
                            WHEN warranty_days IS NOT NULL AND warranty_days > 0 THEN v_start
                            ELSE NULL
                          END,
    warranty_end_date   = CASE
                            WHEN warranty_days IS NOT NULL AND warranty_days > 0 THEN v_start + (warranty_days || ' days')::interval
                            ELSE NULL
                          END
  WHERE repair_id = p_repair_id;

  IF v_old_status IS DISTINCT FROM 'completed' THEN
    INSERT INTO public.repair_status_history (repair_id, from_status, to_status, note, changed_by)
    VALUES (p_repair_id, v_old_status, 'completed', 'Repair finalized & customer invoice completed', v_caller_id);
  END IF;

  RETURN to_jsonb(v_ticket);
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_repair_ticket TO authenticated;

-- 5. Update update_repair_status RPC: strictly enforce operational status transitions
-- Completion & warranty start is EXCLUSIVELY performed by finalize_repair_ticket
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
  v_caller_id uuid := auth.uid();
  v_repair    public.repair_tickets%ROWTYPE;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_new_status = 'completed' THEN
    RAISE EXCEPTION 'Use finalize_repair_ticket to complete a repair';
  END IF;

  SELECT * INTO v_repair FROM public.repair_tickets WHERE id = p_repair_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repair ticket not found';
  END IF;

  IF v_repair.is_finalized THEN
    RAISE EXCEPTION 'This repair ticket is finalized and locked';
  END IF;

  UPDATE public.repair_tickets
  SET status = p_new_status
  WHERE id = p_repair_id;

  INSERT INTO public.repair_status_history (repair_id, from_status, to_status, note, changed_by)
  VALUES (p_repair_id, v_repair.status, p_new_status, p_note, v_caller_id);

  IF p_new_status = 'cancelled' THEN
    PERFORM public.return_repair_parts(
      p_repair_id,
      ARRAY(SELECT id FROM public.repair_parts WHERE repair_id = p_repair_id AND is_returned = false)
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'new_status', p_new_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_repair_status TO authenticated;
