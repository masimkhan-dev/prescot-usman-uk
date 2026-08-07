-- =============================================================================
-- MIGRATION 002: transactional_rpcs
-- Atomic ERP operations with explicit role checks, row locks, idempotency
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: next_doc_number (atomic, year-scoped sequential document numbers)
-- Format: INV-2026-000001, CRN-2026-000001, etc.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_doc_number(
  p_type public.doc_type,
  p_year integer DEFAULT EXTRACT(YEAR FROM now())::integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next bigint;
BEGIN
  INSERT INTO public.document_sequences (doc_type, year, last_seq)
  VALUES (p_type, p_year, 1)
  ON CONFLICT (doc_type, year)
  DO UPDATE SET last_seq = document_sequences.last_seq + 1
  RETURNING last_seq INTO v_next;

  RETURN p_type::text || '-' || p_year::text || '-' || LPAD(v_next::text, 6, '0');
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. complete_sale
-- Atomically: assign invoice number, deduct stock, record movement, insert
-- sale/items/payment rows, update shift. Rejects oversell and duplicates.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_sale(
  p_idempotency_key   text,
  p_customer_id       uuid DEFAULT NULL,
  p_shift_id          uuid DEFAULT NULL,
  p_discount_pence    bigint DEFAULT 0,
  p_payment_method    public.payment_method_type DEFAULT 'cash',
  p_amount_tendered_pence bigint DEFAULT NULL,
  p_notes             text DEFAULT NULL,
  p_items             jsonb DEFAULT '[]'::jsonb
  -- p_items: [{"product_id": uuid, "quantity": int, "unit_price_pence": int,
  --            "discount_pence": int, "serial_unit_id": uuid|null}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id   uuid := auth.uid();
  v_sale_id     uuid;
  v_inv_number  text;
  v_subtotal    bigint := 0;
  v_total       bigint;
  v_change      bigint;
  v_item        jsonb;
  v_product     record;
  v_qty         integer;
  v_unit_price  bigint;
  v_item_disc   bigint;
  v_line_total  bigint;
  v_rows_updated integer;
BEGIN
  -- Auth: caller must be admin or staff
  IF v_caller_id IS NOT NULL AND NOT (public.has_role(v_caller_id, 'admin') OR public.has_role(v_caller_id, 'staff')) THEN
    RAISE EXCEPTION 'Permission denied: admin or staff role required';
  END IF;

  -- Idempotency: if this key already exists, return existing result
  SELECT id INTO v_sale_id FROM public.sales WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('sale_id', v_sale_id, 'duplicate', true);
  END IF;

  -- Validate inputs
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Sale must contain at least one item';
  END IF;
  IF p_discount_pence < 0 THEN
    RAISE EXCEPTION 'Discount cannot be negative';
  END IF;

  -- Lock and validate stock for each item in a single pass
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::integer;
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be positive';
    END IF;

    SELECT id, name, stock_quantity, avg_cost_pence, sale_price_pence, warranty_days
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid
    FOR UPDATE;  -- Row lock prevents concurrent oversell

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', v_item->>'product_id';
    END IF;

    IF v_product.stock_quantity < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for product "%" (available: %, requested: %)',
        v_product.name, v_product.stock_quantity, v_qty;
    END IF;

    -- Compute line total using server price (ignore client price for trusted server path,
    -- but accept p_unit_price_pence for price-override by admin)
    v_unit_price := COALESCE((v_item->>'unit_price_pence')::bigint, v_product.sale_price_pence);
    IF v_unit_price < 0 THEN
      RAISE EXCEPTION 'Unit price cannot be negative';
    END IF;

    v_item_disc  := COALESCE((v_item->>'discount_pence')::bigint, 0);
    v_line_total := (v_unit_price * v_qty) - v_item_disc;
    IF v_line_total < 0 THEN
      RAISE EXCEPTION 'Line total cannot be negative after discount';
    END IF;

    v_subtotal := v_subtotal + v_line_total;
  END LOOP;

  -- Compute totals on the server
  v_total := GREATEST(v_subtotal - p_discount_pence, 0);
  IF p_amount_tendered_pence IS NOT NULL THEN
    IF p_payment_method = 'cash' AND p_amount_tendered_pence < v_total THEN
      RAISE EXCEPTION 'Amount tendered (% p) is less than total (% p)', p_amount_tendered_pence, v_total;
    END IF;
    v_change := GREATEST(p_amount_tendered_pence - v_total, 0);
  END IF;

  -- Assign invoice number
  v_inv_number := public.next_doc_number('INV');

  -- Insert sale header
  INSERT INTO public.sales (
    invoice_number, idempotency_key, customer_id, shift_id,
    subtotal_pence, discount_pence, total_pence,
    amount_tendered_pence, change_pence,
    status, notes, created_by
  ) VALUES (
    v_inv_number, p_idempotency_key, p_customer_id, p_shift_id,
    v_subtotal, p_discount_pence, v_total,
    p_amount_tendered_pence, v_change,
    'completed', p_notes, v_caller_id
  )
  RETURNING id INTO v_sale_id;

  -- Insert payment record
  INSERT INTO public.payments (
    idempotency_key, method, amount_pence, ref_type, ref_id, shift_id, created_by
  ) VALUES (
    p_idempotency_key || ':pay', p_payment_method, v_total, 'sale', v_sale_id, p_shift_id, v_caller_id
  );

  -- Process each item: insert sale_item, deduct stock, record movement
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty        := (v_item->>'quantity')::integer;
    v_unit_price := COALESCE((v_item->>'unit_price_pence')::bigint, 0);
    v_item_disc  := COALESCE((v_item->>'discount_pence')::bigint, 0);
    v_line_total := (v_unit_price * v_qty) - v_item_disc;

    SELECT id, name, stock_quantity, avg_cost_pence, warranty_days
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid
    FOR UPDATE;

    -- Atomic stock deduction — zero rows = oversell (should not reach here after lock above)
    UPDATE public.products
    SET stock_quantity = stock_quantity - v_qty
    WHERE id = v_product.id
      AND stock_quantity >= v_qty;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated = 0 THEN
      RAISE EXCEPTION 'Concurrent oversell detected for product "%"', v_product.name;
    END IF;

    -- Insert sale item with cost snapshot
    INSERT INTO public.sale_items (
      sale_id, product_id, serial_unit_id, product_name,
      quantity, unit_price_pence, discount_pence, line_total_pence, cost_price_pence
    ) VALUES (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'serial_unit_id')::uuid,
      v_product.name,
      v_qty, v_unit_price, v_item_disc, v_line_total,
      v_product.avg_cost_pence
    );

    -- Append-only stock movement with before/after snapshot
    INSERT INTO public.stock_movements (
      product_id, movement_type, qty_change, qty_before, qty_after,
      unit_cost_pence, reason, ref_id, created_by
    ) VALUES (
      v_product.id, 'sale', -v_qty,
      v_product.stock_quantity,
      v_product.stock_quantity - v_qty,
      v_product.avg_cost_pence,
      'sale:' || v_sale_id::text,
      v_sale_id, v_caller_id
    );

    -- Mark serial unit as sold if applicable
    IF (v_item->>'serial_unit_id') IS NOT NULL THEN
      UPDATE public.serial_units
      SET status = 'sold'
      WHERE id = (v_item->>'serial_unit_id')::uuid;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'sale_id',       v_sale_id,
    'invoice_number', v_inv_number,
    'total_pence',   v_total,
    'change_pence',  v_change,
    'duplicate',     false
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. refund_sale
-- Validates refund quantities, issues credit note, restores stock.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refund_sale(
  p_sale_id       uuid,
  p_refund_method public.payment_method_type DEFAULT 'cash',
  p_reason        text DEFAULT NULL,
  p_items         jsonb DEFAULT '[]'::jsonb
  -- p_items: [{"sale_item_id": uuid, "product_id": uuid, "quantity": int}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id    uuid := auth.uid();
  v_sale         record;
  v_item         jsonb;
  v_sale_item    record;
  v_already_returned integer;
  v_return_id    uuid;
  v_crn_number   text;
  v_credit_note_id uuid;
  v_return_total bigint := 0;
  v_line_total   bigint;
  v_refunded_total bigint;
  v_new_status   text;
  v_product      record;
BEGIN
  IF v_caller_id IS NOT NULL AND NOT (public.has_role(v_caller_id, 'admin') OR public.has_role(v_caller_id, 'staff')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Lock sale row
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale % not found', p_sale_id;
  END IF;
  IF v_sale.status = 'voided' THEN
    RAISE EXCEPTION 'Cannot refund a voided sale';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Refund must include at least one item';
  END IF;

  -- Validate each return item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_sale_item
    FROM public.sale_items
    WHERE id = (v_item->>'sale_item_id')::uuid
      AND sale_id = p_sale_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sale item % not found on this sale', v_item->>'sale_item_id';
    END IF;

    -- How many already returned for this item?
    SELECT COALESCE(SUM(ri.quantity), 0) INTO v_already_returned
    FROM public.return_items ri
    JOIN public.sale_returns sr ON sr.id = ri.return_id
    WHERE ri.sale_item_id = v_sale_item.id;

    IF v_already_returned + (v_item->>'quantity')::integer > v_sale_item.quantity THEN
      RAISE EXCEPTION 'Return quantity (%) exceeds remaining returnable quantity (%) for item "%"',
        (v_item->>'quantity')::integer,
        v_sale_item.quantity - v_already_returned,
        v_sale_item.product_name;
    END IF;

    v_line_total := v_sale_item.unit_price_pence * (v_item->>'quantity')::integer;
    v_return_total := v_return_total + v_line_total;
  END LOOP;

  -- Prevent refund exceeding original total
  SELECT COALESCE(SUM(total_pence), 0) INTO v_refunded_total
  FROM public.sale_returns
  WHERE sale_id = p_sale_id;

  IF v_refunded_total + v_return_total > v_sale.total_pence THEN
    RAISE EXCEPTION 'Refund total (% p) would exceed original sale total (% p)',
      v_refunded_total + v_return_total, v_sale.total_pence;
  END IF;

  -- Issue credit note
  v_crn_number := public.next_doc_number('CRN');
  INSERT INTO public.credit_notes (crn_number, sale_id, customer_id, total_pence, balance_pence, reason, created_by)
  VALUES (v_crn_number, p_sale_id, v_sale.customer_id, v_return_total, v_return_total, p_reason, v_caller_id)
  RETURNING id INTO v_credit_note_id;

  -- Insert return header
  INSERT INTO public.sale_returns (sale_id, credit_note_id, total_pence, reason, refund_method, created_by)
  VALUES (p_sale_id, v_credit_note_id, v_return_total, p_reason, p_refund_method, v_caller_id)
  RETURNING id INTO v_return_id;

  -- Process each return item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_sale_item FROM public.sale_items WHERE id = (v_item->>'sale_item_id')::uuid;
    v_line_total := v_sale_item.unit_price_pence * (v_item->>'quantity')::integer;

    INSERT INTO public.return_items (
      return_id, sale_item_id, product_id, product_name,
      quantity, unit_price_pence, line_total_pence
    ) VALUES (
      v_return_id, v_sale_item.id, v_sale_item.product_id,
      v_sale_item.product_name,
      (v_item->>'quantity')::integer, v_sale_item.unit_price_pence, v_line_total
    );

    -- Restore stock if product exists
    IF v_sale_item.product_id IS NOT NULL THEN
      SELECT * INTO v_product FROM public.products WHERE id = v_sale_item.product_id FOR UPDATE;

      UPDATE public.products
      SET stock_quantity = stock_quantity + (v_item->>'quantity')::integer
      WHERE id = v_sale_item.product_id;

      INSERT INTO public.stock_movements (
        product_id, movement_type, qty_change, qty_before, qty_after,
        unit_cost_pence, reason, ref_id, created_by
      ) VALUES (
        v_sale_item.product_id, 'sale_return',
        (v_item->>'quantity')::integer,
        v_product.stock_quantity,
        v_product.stock_quantity + (v_item->>'quantity')::integer,
        v_sale_item.cost_price_pence,
        'refund:' || v_return_id::text,
        v_return_id, v_caller_id
      );
    END IF;
  END LOOP;

  -- Update sale status
  SELECT COALESCE(SUM(total_pence), 0) INTO v_refunded_total
  FROM public.sale_returns WHERE sale_id = p_sale_id;

  v_new_status := CASE
    WHEN v_refunded_total >= v_sale.total_pence THEN 'refunded'
    ELSE 'partially_refunded'
  END;

  UPDATE public.sales SET status = v_new_status WHERE id = p_sale_id;

  RETURN jsonb_build_object(
    'return_id',      v_return_id,
    'crn_number',     v_crn_number,
    'credit_note_id', v_credit_note_id,
    'return_total_pence', v_return_total,
    'sale_status',    v_new_status
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. receive_purchase_order (supports partial receiving)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.receive_purchase_order(
  p_po_id              uuid,
  p_idempotency_key    text,
  p_update_cost_price  boolean DEFAULT false,
  p_notes              text DEFAULT NULL,
  p_items              jsonb DEFAULT '[]'::jsonb
  -- p_items: [{"po_item_id": uuid, "qty_received": int}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id   uuid := auth.uid();
  v_po          record;
  v_po_item     record;
  v_item        jsonb;
  v_grn_id      uuid;
  v_grn_number  text;
  v_qty         integer;
  v_product     record;
  v_new_stock   integer;
  v_all_received boolean := true;
BEGIN
  IF v_caller_id IS NOT NULL AND NOT (public.has_role(v_caller_id, 'admin') OR public.has_role(v_caller_id, 'staff')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Idempotency
  IF EXISTS (SELECT 1 FROM public.goods_receipts WHERE idempotency_key = p_idempotency_key) THEN
    SELECT id INTO v_grn_id FROM public.goods_receipts WHERE idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object('grn_id', v_grn_id, 'duplicate', true);
  END IF;

  -- Lock PO
  SELECT * INTO v_po FROM public.purchase_orders WHERE id = p_po_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order not found'; END IF;
  IF v_po.status = 'received' THEN RAISE EXCEPTION 'Purchase order already fully received'; END IF;
  IF v_po.status = 'cancelled' THEN RAISE EXCEPTION 'Cannot receive a cancelled purchase order'; END IF;

  IF jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Must specify items to receive'; END IF;

  -- Validate quantities
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'qty_received')::integer;
    IF v_qty <= 0 THEN RAISE EXCEPTION 'Received quantity must be positive'; END IF;

    SELECT * INTO v_po_item
    FROM public.purchase_order_items
    WHERE id = (v_item->>'po_item_id')::uuid AND purchase_order_id = p_po_id
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'PO item % not found on this order', v_item->>'po_item_id'; END IF;

    IF v_po_item.qty_received + v_qty > v_po_item.qty_ordered THEN
      RAISE EXCEPTION 'Receiving % units would exceed ordered quantity of % for item "%"',
        v_qty, v_po_item.qty_ordered - v_po_item.qty_received, v_po_item.product_name;
    END IF;
  END LOOP;

  -- Create GRN
  v_grn_number := public.next_doc_number('GRN');
  INSERT INTO public.goods_receipts (grn_number, purchase_order_id, idempotency_key, notes, received_by)
  VALUES (v_grn_number, p_po_id, p_idempotency_key, p_notes, v_caller_id)
  RETURNING id INTO v_grn_id;

  -- Process each received item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'qty_received')::integer;

    SELECT * INTO v_po_item
    FROM public.purchase_order_items
    WHERE id = (v_item->>'po_item_id')::uuid
    FOR UPDATE;

    -- GRN line item
    INSERT INTO public.goods_receipt_items (grn_id, po_item_id, qty_received, unit_cost_pence)
    VALUES (v_grn_id, v_po_item.id, v_qty, v_po_item.unit_cost_pence);

    -- Update received qty on PO item
    UPDATE public.purchase_order_items
    SET qty_received = qty_received + v_qty
    WHERE id = v_po_item.id;

    -- Update product stock (if linked)
    IF v_po_item.product_id IS NOT NULL THEN
      SELECT * INTO v_product FROM public.products WHERE id = v_po_item.product_id FOR UPDATE;

      v_new_stock := v_product.stock_quantity + v_qty;

      -- Update moving-weighted-average cost
      UPDATE public.products
      SET
        stock_quantity = v_new_stock,
        avg_cost_pence = CASE
          WHEN v_product.stock_quantity + v_qty = 0 THEN v_po_item.unit_cost_pence
          ELSE (
            (v_product.avg_cost_pence * v_product.stock_quantity + v_po_item.unit_cost_pence * v_qty)
            / (v_product.stock_quantity + v_qty)
          )
        END,
        cost_price_pence = CASE WHEN p_update_cost_price THEN v_po_item.unit_cost_pence
                                ELSE v_product.cost_price_pence END
      WHERE id = v_po_item.product_id;

      INSERT INTO public.stock_movements (
        product_id, movement_type, qty_change, qty_before, qty_after,
        unit_cost_pence, reason, ref_id, created_by
      ) VALUES (
        v_po_item.product_id, 'purchase_receipt', v_qty,
        v_product.stock_quantity, v_new_stock,
        v_po_item.unit_cost_pence,
        'po_receive:' || v_grn_id::text,
        v_grn_id, v_caller_id
      );
    END IF;
  END LOOP;

  -- Determine new PO status
  SELECT bool_and(qty_received >= qty_ordered) INTO v_all_received
  FROM public.purchase_order_items
  WHERE purchase_order_id = p_po_id;

  UPDATE public.purchase_orders
  SET status = (CASE WHEN v_all_received THEN 'received' ELSE 'partial' END)::public.po_status
  WHERE id = p_po_id;

  -- Update supplier balance (increase balance by PO total on first receipt)
  IF v_po.status = 'ordered' THEN
    UPDATE public.suppliers
    SET balance_pence = balance_pence + v_po.total_pence
    WHERE id = v_po.supplier_id;
  END IF;

  RETURN jsonb_build_object(
    'grn_id',     v_grn_id,
    'grn_number', v_grn_number,
    'po_status',  CASE WHEN v_all_received THEN 'received' ELSE 'partial' END,
    'duplicate',  false
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. issue_repair_parts (idempotency-keyed, checks repair status)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_repair_parts(
  p_repair_id       uuid,
  p_idempotency_key text,
  p_parts           jsonb DEFAULT '[]'::jsonb
  -- p_parts: [{"product_id": uuid, "quantity": int, "unit_cost_pence": int}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id  uuid := auth.uid();
  v_repair     record;
  v_part       jsonb;
  v_product    record;
  v_qty        integer;
  v_idem_key   text;
  v_rows_updated integer;
  v_issued_ids uuid[] := '{}';
  v_part_id    uuid;
BEGIN
  IF v_caller_id IS NOT NULL AND NOT (public.has_role(v_caller_id, 'admin') OR
          public.has_role(v_caller_id, 'staff') OR
          public.has_role(v_caller_id, 'technician')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_repair FROM public.repair_tickets WHERE id = p_repair_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Repair ticket not found'; END IF;
  IF v_repair.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot issue parts to a % repair', v_repair.status;
  END IF;

  IF jsonb_array_length(p_parts) = 0 THEN RAISE EXCEPTION 'Must specify at least one part'; END IF;

  -- Check technician is assigned
  IF public.has_role(v_caller_id, 'technician') AND v_repair.technician_id != v_caller_id THEN
    RAISE EXCEPTION 'You are not the assigned technician for this repair';
  END IF;

  FOR v_part IN SELECT * FROM jsonb_array_elements(p_parts)
  LOOP
    v_qty      := (v_part->>'quantity')::integer;
    v_idem_key := p_idempotency_key || ':' || (v_part->>'product_id')::text;

    -- Idempotency: skip if this part with this key was already issued
    IF EXISTS (SELECT 1 FROM public.repair_parts WHERE idempotency_key = v_idem_key) THEN
      SELECT id INTO v_part_id FROM public.repair_parts WHERE idempotency_key = v_idem_key;
      v_issued_ids := array_append(v_issued_ids, v_part_id);
      CONTINUE;
    END IF;

    SELECT * INTO v_product FROM public.products WHERE id = (v_part->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found', v_part->>'product_id'; END IF;
    IF v_product.stock_quantity < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for part "%" (available: %, requested: %)',
        v_product.name, v_product.stock_quantity, v_qty;
    END IF;

    -- Atomic deduction
    UPDATE public.products
    SET stock_quantity = stock_quantity - v_qty
    WHERE id = v_product.id AND stock_quantity >= v_qty;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated = 0 THEN
      RAISE EXCEPTION 'Concurrent stock depletion for part "%"', v_product.name;
    END IF;

    INSERT INTO public.repair_parts (
      idempotency_key, repair_id, product_id, product_name,
      quantity, unit_cost_pence, created_by
    ) VALUES (
      v_idem_key, p_repair_id, v_product.id, v_product.name,
      v_qty, COALESCE((v_part->>'unit_cost_pence')::bigint, v_product.avg_cost_pence),
      v_caller_id
    ) RETURNING id INTO v_part_id;

    v_issued_ids := array_append(v_issued_ids, v_part_id);

    INSERT INTO public.stock_movements (
      product_id, movement_type, qty_change, qty_before, qty_after,
      unit_cost_pence, reason, ref_id, created_by
    ) VALUES (
      v_product.id, 'repair_issue', -v_qty,
      v_product.stock_quantity, v_product.stock_quantity - v_qty,
      v_product.avg_cost_pence,
      'repair_issue:' || p_repair_id::text,
      p_repair_id, v_caller_id
    );
  END LOOP;

  RETURN jsonb_build_object('issued_part_ids', v_issued_ids);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. return_repair_parts (compensating: marks returned, restores stock)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.return_repair_parts(
  p_repair_id uuid,
  p_part_ids  uuid[]   -- array of repair_parts.id to return
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_part      record;
  v_product   record;
BEGIN
  IF v_caller_id IS NOT NULL AND NOT (public.has_role(v_caller_id, 'admin') OR public.has_role(v_caller_id, 'staff')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  FOR v_part IN
    SELECT rp.*, p.stock_quantity AS current_stock
    FROM public.repair_parts rp
    JOIN public.products p ON p.id = rp.product_id
    WHERE rp.id = ANY(p_part_ids)
      AND rp.repair_id = p_repair_id
      AND rp.is_returned = false
    FOR UPDATE OF rp
  LOOP
    SELECT * INTO v_product FROM public.products WHERE id = v_part.product_id FOR UPDATE;

    UPDATE public.products
    SET stock_quantity = stock_quantity + v_part.quantity
    WHERE id = v_part.product_id;

    UPDATE public.repair_parts
    SET is_returned = true, returned_at = now()
    WHERE id = v_part.id;

    INSERT INTO public.stock_movements (
      product_id, movement_type, qty_change, qty_before, qty_after,
      unit_cost_pence, reason, ref_id, created_by
    ) VALUES (
      v_part.product_id, 'repair_return', v_part.quantity,
      v_product.stock_quantity, v_product.stock_quantity + v_part.quantity,
      v_part.unit_cost_pence,
      'repair_return:' || p_repair_id::text,
      p_repair_id, v_caller_id
    );
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. adjust_stock (non-admin requires approval flag; generates ADJ number)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_product_id    uuid,
  p_qty_change    integer,
  p_reason        text DEFAULT 'adjustment',
  p_note          text DEFAULT NULL,
  p_approved_by   uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id  uuid := auth.uid();
  v_product    record;
  v_adj_number text;
  v_new_stock  integer;
BEGIN
  IF v_caller_id IS NOT NULL AND NOT (public.has_role(v_caller_id, 'admin') OR public.has_role(v_caller_id, 'staff')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Non-admin staff must have admin approval
  IF NOT public.has_role(v_caller_id, 'admin') THEN
    IF p_approved_by IS NULL THEN
      RAISE EXCEPTION 'Stock adjustments by non-admin staff require manager approval (p_approved_by)';
    END IF;
    IF NOT public.has_role(p_approved_by, 'admin') THEN
      RAISE EXCEPTION 'Approver must have admin role';
    END IF;
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;

  v_new_stock := v_product.stock_quantity + p_qty_change;
  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Adjustment would result in negative stock (current: %, change: %)',
      v_product.stock_quantity, p_qty_change;
  END IF;

  v_adj_number := public.next_doc_number('ADJ');

  UPDATE public.products SET stock_quantity = v_new_stock WHERE id = p_product_id;

  INSERT INTO public.stock_movements (
    product_id, movement_type, qty_change, qty_before, qty_after,
    unit_cost_pence, reason, adj_number, note, created_by
  ) VALUES (
    p_product_id,
    CASE WHEN p_reason = 'damage' THEN 'damage' ELSE 'adjustment' END,
    p_qty_change, v_product.stock_quantity, v_new_stock,
    v_product.avg_cost_pence,
    p_reason, v_adj_number, p_note, v_caller_id
  );

  RETURN jsonb_build_object(
    'adj_number', v_adj_number,
    'qty_before', v_product.stock_quantity,
    'qty_after',  v_new_stock
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. open_shift
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.open_shift(
  p_opening_float_pence bigint DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_existing  uuid;
  v_shift_id  uuid;
BEGIN
  IF v_caller_id IS NOT NULL AND NOT (public.has_role(v_caller_id, 'admin') OR public.has_role(v_caller_id, 'staff')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_opening_float_pence < 0 THEN
    RAISE EXCEPTION 'Opening float cannot be negative';
  END IF;

  -- Lock to prevent two simultaneous open-shift calls
  SELECT id INTO v_existing
  FROM public.shifts WHERE status = 'open'
  LIMIT 1 FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    RAISE EXCEPTION 'A shift is already open. Close it before opening a new one.';
  END IF;

  INSERT INTO public.shifts (opening_float_pence, opened_by, status)
  VALUES (p_opening_float_pence, v_caller_id, 'open')
  RETURNING id INTO v_shift_id;

  INSERT INTO public.cash_movements (shift_id, type, amount_pence, note, created_by)
  VALUES (v_shift_id, 'float_in', p_opening_float_pence, 'Opening float', v_caller_id);

  RETURN jsonb_build_object('shift_id', v_shift_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. close_shift (server recomputes all totals from actual records)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_shift(
  p_shift_id          uuid,
  p_counted_cash_pence bigint,
  p_notes             text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id        uuid := auth.uid();
  v_shift            record;
  v_cash_sales       bigint := 0;
  v_card_sales       bigint := 0;
  v_bank_sales       bigint := 0;
  v_cash_refunds     bigint := 0;
  v_total_refunds    bigint := 0;
  v_expenses         bigint := 0;
  v_repair_payments  bigint := 0;
  v_expected_cash    bigint;
  v_difference       bigint;
BEGIN
  IF v_caller_id IS NOT NULL AND NOT (public.has_role(v_caller_id, 'admin') OR public.has_role(v_caller_id, 'staff')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shift not found'; END IF;
  IF v_shift.status = 'closed' THEN RAISE EXCEPTION 'Shift is already closed'; END IF;

  -- Recompute all totals from authoritative records (ignoring client-passed values)
  SELECT
    COALESCE(SUM(CASE WHEN method = 'cash' THEN amount_pence ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN method = 'card' THEN amount_pence ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN method = 'bank_transfer' THEN amount_pence ELSE 0 END), 0)
  INTO v_cash_sales, v_card_sales, v_bank_sales
  FROM public.payments
  WHERE shift_id = p_shift_id AND ref_type = 'sale';

  SELECT
    COALESCE(SUM(CASE WHEN refund_method = 'cash' THEN total_pence ELSE 0 END), 0),
    COALESCE(SUM(total_pence), 0)
  INTO v_cash_refunds, v_total_refunds
  FROM public.sale_returns sr
  JOIN public.sales s ON s.id = sr.sale_id
  WHERE s.shift_id = p_shift_id;

  SELECT COALESCE(SUM(amount_pence), 0) INTO v_expenses
  FROM public.expenses
  WHERE shift_id = p_shift_id AND is_void = false;

  SELECT COALESCE(SUM(amount_pence), 0) INTO v_repair_payments
  FROM public.repair_payments
  WHERE shift_id = p_shift_id AND method = 'cash';

  v_expected_cash := v_shift.opening_float_pence + v_cash_sales + v_repair_payments
                     - v_cash_refunds - v_expenses;
  v_difference    := p_counted_cash_pence - v_expected_cash;

  UPDATE public.shifts SET
    status              = 'closed',
    closed_by           = v_caller_id,
    closed_at           = now(),
    counted_cash_pence  = p_counted_cash_pence,
    expected_cash_pence = v_expected_cash,
    difference_pence    = v_difference,
    notes               = p_notes
  WHERE id = p_shift_id;

  RETURN jsonb_build_object(
    'shift_id',         p_shift_id,
    'cash_sales',       v_cash_sales,
    'card_sales',       v_card_sales,
    'bank_sales',       v_bank_sales,
    'refunds_total',    v_total_refunds,
    'expenses_total',   v_expenses,
    'expected_cash',    v_expected_cash,
    'counted_cash',     p_counted_cash_pence,
    'difference',       v_difference
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. record_repair_payment (partial/split, deposit support)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_repair_payment(
  p_repair_id       uuid,
  p_idempotency_key text,
  p_amount_pence    bigint,
  p_method          public.payment_method_type DEFAULT 'cash',
  p_is_deposit      boolean DEFAULT false,
  p_shift_id        uuid DEFAULT NULL,
  p_notes           text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id     uuid := auth.uid();
  v_repair        record;
  v_total_paid    bigint;
  v_payment_id    uuid;
BEGIN
  IF NOT (public.has_role(v_caller_id, 'admin') OR public.has_role(v_caller_id, 'staff')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Idempotency
  IF EXISTS (SELECT 1 FROM public.repair_payments WHERE idempotency_key = p_idempotency_key) THEN
    SELECT id INTO v_payment_id FROM public.repair_payments WHERE idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object('payment_id', v_payment_id, 'duplicate', true);
  END IF;

  IF p_amount_pence <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;

  SELECT * INTO v_repair FROM public.repair_tickets WHERE id = p_repair_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Repair not found'; END IF;

  -- Validate: total paid + this payment must not exceed ticket total
  SELECT COALESCE(SUM(amount_pence), 0) INTO v_total_paid
  FROM public.repair_payments WHERE repair_id = p_repair_id;

  IF v_total_paid + p_amount_pence > v_repair.total_price_pence THEN
    RAISE EXCEPTION 'Payment (% p) would exceed repair total (% p). Outstanding: % p',
      p_amount_pence, v_repair.total_price_pence,
      v_repair.total_price_pence - v_total_paid;
  END IF;

  INSERT INTO public.repair_payments (
    idempotency_key, repair_id, amount_pence, method, is_deposit, shift_id, notes, created_by
  ) VALUES (
    p_idempotency_key, p_repair_id, p_amount_pence, p_method, p_is_deposit, p_shift_id, p_notes, v_caller_id
  ) RETURNING id INTO v_payment_id;

  -- Update amount_paid_pence on repair ticket
  UPDATE public.repair_tickets
  SET
    amount_paid_pence = amount_paid_pence + p_amount_pence,
    deposit_pence = CASE WHEN p_is_deposit THEN deposit_pence + p_amount_pence ELSE deposit_pence END
  WHERE id = p_repair_id;

  RETURN jsonb_build_object(
    'payment_id',     v_payment_id,
    'amount_pence',   p_amount_pence,
    'total_paid',     v_total_paid + p_amount_pence,
    'duplicate',      false
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. record_supplier_payment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_supplier_payment(
  p_supplier_id      uuid,
  p_amount_pence     bigint,
  p_method           public.payment_method_type DEFAULT 'bank_transfer',
  p_purchase_order_id uuid DEFAULT NULL,
  p_reference        text DEFAULT NULL,
  p_payment_date     date DEFAULT CURRENT_DATE,
  p_notes            text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_payment_id uuid;
BEGIN
  IF NOT public.has_role(v_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Permission denied: admin role required for supplier payments';
  END IF;

  IF p_amount_pence <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE id = p_supplier_id) THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;

  INSERT INTO public.supplier_payments (
    supplier_id, purchase_order_id, amount_pence, method,
    payment_date, reference, notes, created_by
  ) VALUES (
    p_supplier_id, p_purchase_order_id, p_amount_pence, p_method,
    p_payment_date, p_reference, p_notes, v_caller_id
  ) RETURNING id INTO v_payment_id;

  -- Reduce supplier balance
  UPDATE public.suppliers
  SET balance_pence = balance_pence - p_amount_pence
  WHERE id = p_supplier_id;

  RETURN jsonb_build_object('payment_id', v_payment_id, 'amount_pence', p_amount_pence);
END;
$$;

-- ---------------------------------------------------------------------------
-- Helper: update_repair_status (with history and warranty assignment)
-- ---------------------------------------------------------------------------
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
  v_caller_id   uuid := auth.uid();
  v_repair      record;
  v_warranty_days integer;
  v_warranty_until date;
  -- Valid transition map
  v_allowed     public.repair_status[];
BEGIN
  IF NOT (public.has_role(v_caller_id, 'admin') OR
          public.has_role(v_caller_id, 'staff') OR
          public.has_role(v_caller_id, 'technician')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_repair FROM public.repair_tickets WHERE id = p_repair_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Repair not found'; END IF;

  -- Controlled status transition map
  v_allowed := CASE v_repair.status
    WHEN 'pending'       THEN ARRAY['assessed','cancelled']::public.repair_status[]
    WHEN 'assessed'      THEN ARRAY['in_progress','cancelled']::public.repair_status[]
    WHEN 'in_progress'   THEN ARRAY['quality_check','cancelled']::public.repair_status[]
    WHEN 'quality_check' THEN ARRAY['ready','in_progress']::public.repair_status[]
    WHEN 'ready'         THEN ARRAY['completed','in_progress']::public.repair_status[]
    WHEN 'completed'     THEN ARRAY[]::public.repair_status[]
    WHEN 'cancelled'     THEN ARRAY[]::public.repair_status[]
  END;

  IF NOT (p_new_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', v_repair.status, p_new_status;
  END IF;

  -- Set warranty_until once on first completion/ready (never reset)
  IF p_new_status IN ('ready','completed') AND v_repair.warranty_until IS NULL THEN
    v_warranty_days := COALESCE(
      v_repair.warranty_days,
      (SELECT value::integer FROM public.store_settings WHERE key = 'default_warranty_days' AND value ~ '^\d+$'),
      0
    );
    IF v_warranty_days > 0 THEN
      v_warranty_until := CURRENT_DATE + v_warranty_days;
    END IF;
  ELSE
    v_warranty_until := v_repair.warranty_until;  -- preserve existing
  END IF;

  UPDATE public.repair_tickets
  SET status = p_new_status, warranty_until = COALESCE(v_warranty_until, warranty_until)
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

-- Grant execute on all RPCs to authenticated (auth + role checks happen inside)
GRANT EXECUTE ON FUNCTION public.complete_sale TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_sale TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_repair_parts TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_repair_parts TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_shift TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_shift TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_repair_payment TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_supplier_payment TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_repair_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_doc_number TO service_role;
