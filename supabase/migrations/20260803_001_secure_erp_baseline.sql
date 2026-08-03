-- =============================================================================
-- MIGRATION 001: secure_erp_baseline
-- Prescot Mobiles ERP — Clean secure schema
-- Applied: remote Supabase project sykeokixtcgvsqjvrslj
-- Pre-check: SELECT COUNT(*) FROM information_schema.tables
--            WHERE table_schema = 'public'; must return 0
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Enum types
-- ---------------------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'technician');

CREATE TYPE public.payment_method_type AS ENUM (
  'cash', 'card', 'bank_transfer', 'credit_note', 'split'
);

CREATE TYPE public.doc_type AS ENUM (
  'INV', 'CRN', 'REP', 'PO', 'GRN', 'ADJ'
);

CREATE TYPE public.repair_status AS ENUM (
  'pending', 'assessed', 'in_progress', 'quality_check',
  'ready', 'completed', 'cancelled'
);

CREATE TYPE public.po_status AS ENUM (
  'draft', 'ordered', 'partial', 'received', 'cancelled'
);

CREATE TYPE public.movement_type AS ENUM (
  'sale', 'sale_return', 'repair_issue', 'repair_return',
  'purchase_receipt', 'adjustment', 'damage', 'opening_count'
);

CREATE TYPE public.stock_track_type AS ENUM ('quantity', 'serial');

-- ---------------------------------------------------------------------------
-- 2. Utility: update_updated_at trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Profiles & roles
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  full_name  text,
  phone      text,
  avatar_url text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.user_roles (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    public.app_role NOT NULL,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Core role-check helper used everywhere in RLS policies
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Convenience: check current session user
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), _role);
$$;

-- RLS: profiles
CREATE POLICY "profiles_own_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "profiles_own_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: user_roles
CREATE POLICY "roles_own_select"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles_admin_all"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 4. Store settings (flat key-value, admin-managed)
-- ---------------------------------------------------------------------------
CREATE TABLE public.store_settings (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;

CREATE POLICY "settings_select_authenticated"
  ON public.store_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "settings_admin_write"
  ON public.store_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 5. Document sequences (atomic, per-type per-year)
-- ---------------------------------------------------------------------------
CREATE TABLE public.document_sequences (
  doc_type public.doc_type NOT NULL,
  year     integer NOT NULL,
  last_seq bigint  NOT NULL DEFAULT 0,
  PRIMARY KEY (doc_type, year)
);
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.document_sequences TO authenticated;
GRANT ALL ON public.document_sequences TO service_role;

CREATE POLICY "docseq_admin_select"
  ON public.document_sequences FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ---------------------------------------------------------------------------
-- 6. Suppliers
-- ---------------------------------------------------------------------------
CREATE TABLE public.suppliers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  phone           text,
  email           text,
  address         text,
  notes           text,
  -- Running balance in pence (positive = we owe them)
  balance_pence   bigint NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "suppliers_staff_read"
  ON public.suppliers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "suppliers_admin_write"
  ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "suppliers_admin_update"
  ON public.suppliers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "suppliers_admin_delete"
  ON public.suppliers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 7. Customers
-- ---------------------------------------------------------------------------
CREATE TABLE public.customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  phone      text,
  email      text,
  address    text,
  notes      text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_customers_name ON public.customers USING gin(to_tsvector('english', name));
CREATE INDEX idx_customers_phone ON public.customers(phone) WHERE phone IS NOT NULL;

CREATE POLICY "customers_staff_read"
  ON public.customers FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff') OR
    public.has_role(auth.uid(), 'technician')
  );

CREATE POLICY "customers_staff_write"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "customers_staff_update"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "customers_admin_delete"
  ON public.customers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 8. Products & variants
-- ---------------------------------------------------------------------------
CREATE TABLE public.products (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  category            text NOT NULL DEFAULT 'Accessories',
  sku                 text,
  barcode             text,
  type                text NOT NULL DEFAULT 'product'
                        CHECK (type IN ('product','part','service')),
  track_type          public.stock_track_type NOT NULL DEFAULT 'quantity',
  -- All prices in pence (integer)
  cost_price_pence    bigint NOT NULL DEFAULT 0
                        CHECK (cost_price_pence >= 0),
  sale_price_pence    bigint NOT NULL DEFAULT 0
                        CHECK (sale_price_pence >= 0),
  -- Moving-weighted-average cost (stored as pence, updated on each purchase)
  avg_cost_pence      bigint NOT NULL DEFAULT 0
                        CHECK (avg_cost_pence >= 0),
  stock_quantity      integer NOT NULL DEFAULT 0
                        CHECK (stock_quantity >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 5
                        CHECK (low_stock_threshold >= 0),
  warranty_days       integer NOT NULL DEFAULT 0
                        CHECK (warranty_days >= 0),
  status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','inactive')),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Partial unique indexes: only enforce uniqueness for non-null, non-empty values
CREATE UNIQUE INDEX idx_products_sku
  ON public.products(sku)
  WHERE sku IS NOT NULL AND sku <> '';

CREATE UNIQUE INDEX idx_products_barcode
  ON public.products(barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';

CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_status   ON public.products(status);
CREATE INDEX idx_products_name     ON public.products USING gin(to_tsvector('english', name));

CREATE POLICY "products_any_read"
  ON public.products FOR SELECT TO authenticated USING (true);

CREATE POLICY "products_staff_write"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "products_staff_update"
  ON public.products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "products_admin_delete"
  ON public.products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Serial/IMEI units for tracked devices
CREATE TABLE public.serial_units (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  imei        text,
  serial_number text,
  condition   text NOT NULL DEFAULT 'new' CHECK (condition IN ('new','refurbished','used','faulty')),
  cost_pence  bigint NOT NULL DEFAULT 0 CHECK (cost_pence >= 0),
  status      text NOT NULL DEFAULT 'in_stock'
                CHECK (status IN ('in_stock','reserved','sold','returned','scrapped')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.serial_units ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.serial_units TO authenticated;
GRANT ALL ON public.serial_units TO service_role;

CREATE TRIGGER serial_units_updated_at
  BEFORE UPDATE ON public.serial_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE UNIQUE INDEX idx_serial_imei
  ON public.serial_units(imei)
  WHERE imei IS NOT NULL AND imei <> '';

CREATE UNIQUE INDEX idx_serial_sn
  ON public.serial_units(serial_number)
  WHERE serial_number IS NOT NULL AND serial_number <> '';

CREATE POLICY "serial_staff_read"
  ON public.serial_units FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "serial_staff_write"
  ON public.serial_units FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "serial_staff_update"
  ON public.serial_units FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ---------------------------------------------------------------------------
-- 9. Shifts & cash movements
-- ---------------------------------------------------------------------------
CREATE TABLE public.shifts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  opening_float_pence bigint NOT NULL DEFAULT 0 CHECK (opening_float_pence >= 0),
  counted_cash_pence  bigint,
  expected_cash_pence bigint,
  difference_pence    bigint,
  notes               text,
  status              text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opened_at           timestamptz NOT NULL DEFAULT now(),
  closed_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;

CREATE TRIGGER shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_shifts_status ON public.shifts(status);

CREATE POLICY "shifts_staff_read"
  ON public.shifts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "shifts_admin_all"
  ON public.shifts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.cash_movements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id     uuid NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
  type         text NOT NULL CHECK (type IN ('float_in','float_out','expense','sale','refund','repair_payment')),
  amount_pence bigint NOT NULL,
  note         text,
  ref_id       uuid,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.cash_movements TO authenticated;
GRANT ALL ON public.cash_movements TO service_role;

CREATE INDEX idx_cash_movements_shift ON public.cash_movements(shift_id, created_at DESC);

CREATE POLICY "cash_movements_staff_read"
  ON public.cash_movements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ---------------------------------------------------------------------------
-- 10. Sales, items, payments
-- ---------------------------------------------------------------------------
CREATE TABLE public.sales (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  text UNIQUE,
  idempotency_key text UNIQUE NOT NULL,
  customer_id     uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  shift_id        uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  -- All amounts in pence — server-computed only
  subtotal_pence  bigint NOT NULL DEFAULT 0 CHECK (subtotal_pence >= 0),
  discount_pence  bigint NOT NULL DEFAULT 0 CHECK (discount_pence >= 0),
  total_pence     bigint NOT NULL DEFAULT 0 CHECK (total_pence >= 0),
  amount_tendered_pence bigint,
  change_pence    bigint,
  status          text NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('completed','partially_refunded','refunded','voided')),
  warranty_until  date,
  notes           text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;

CREATE INDEX idx_sales_created   ON public.sales(created_at DESC);
CREATE INDEX idx_sales_status    ON public.sales(status);
CREATE INDEX idx_sales_customer  ON public.sales(customer_id);
CREATE INDEX idx_sales_shift     ON public.sales(shift_id);
CREATE INDEX idx_sales_idem      ON public.sales(idempotency_key);

CREATE POLICY "sales_staff_read"
  ON public.sales FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- No direct INSERT/UPDATE/DELETE for any client role on sales;
-- all writes go through complete_sale / refund_sale RPCs (service_role)

CREATE TABLE public.sale_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id           uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id        uuid REFERENCES public.products(id) ON DELETE SET NULL,
  serial_unit_id    uuid REFERENCES public.serial_units(id) ON DELETE SET NULL,
  product_name      text NOT NULL,
  quantity          integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_pence  bigint NOT NULL DEFAULT 0 CHECK (unit_price_pence >= 0),
  discount_pence    bigint NOT NULL DEFAULT 0 CHECK (discount_pence >= 0),
  line_total_pence  bigint NOT NULL DEFAULT 0 CHECK (line_total_pence >= 0),
  -- Cost snapshot at time of sale (for COGS)
  cost_price_pence  bigint NOT NULL DEFAULT 0 CHECK (cost_price_pence >= 0)
);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;

CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);

CREATE POLICY "sale_items_staff_read"
  ON public.sale_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Payments (covers sales and repairs)
CREATE TABLE public.payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key  text UNIQUE NOT NULL,
  method           public.payment_method_type NOT NULL,
  amount_pence     bigint NOT NULL CHECK (amount_pence > 0),
  ref_type         text NOT NULL CHECK (ref_type IN ('sale','repair','supplier')),
  ref_id           uuid NOT NULL,
  shift_id         uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  notes            text,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

CREATE INDEX idx_payments_ref    ON public.payments(ref_id, ref_type);
CREATE INDEX idx_payments_shift  ON public.payments(shift_id);
CREATE INDEX idx_payments_method ON public.payments(method);

CREATE POLICY "payments_staff_read"
  ON public.payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Credit notes
CREATE TABLE public.credit_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crn_number    text UNIQUE,
  sale_id       uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_id   uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  balance_pence bigint NOT NULL DEFAULT 0 CHECK (balance_pence >= 0),
  total_pence   bigint NOT NULL DEFAULT 0 CHECK (total_pence >= 0),
  reason        text,
  is_void       boolean NOT NULL DEFAULT false,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.credit_notes TO authenticated;
GRANT ALL ON public.credit_notes TO service_role;

CREATE INDEX idx_credit_notes_customer ON public.credit_notes(customer_id);

CREATE POLICY "credit_notes_staff_read"
  ON public.credit_notes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Sale returns
CREATE TABLE public.sale_returns (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id        uuid NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
  credit_note_id uuid REFERENCES public.credit_notes(id) ON DELETE SET NULL,
  total_pence    bigint NOT NULL DEFAULT 0 CHECK (total_pence >= 0),
  reason         text,
  refund_method  public.payment_method_type NOT NULL DEFAULT 'cash',
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sale_returns ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.sale_returns TO authenticated;
GRANT ALL ON public.sale_returns TO service_role;

CREATE INDEX idx_sale_returns_sale ON public.sale_returns(sale_id);

CREATE POLICY "sale_returns_staff_read"
  ON public.sale_returns FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TABLE public.return_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id         uuid NOT NULL REFERENCES public.sale_returns(id) ON DELETE CASCADE,
  sale_item_id      uuid REFERENCES public.sale_items(id) ON DELETE SET NULL,
  product_id        uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name      text NOT NULL,
  quantity          integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_pence  bigint NOT NULL DEFAULT 0 CHECK (unit_price_pence >= 0),
  line_total_pence  bigint NOT NULL DEFAULT 0 CHECK (line_total_pence >= 0)
);
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.return_items TO authenticated;
GRANT ALL ON public.return_items TO service_role;

CREATE POLICY "return_items_staff_read"
  ON public.return_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ---------------------------------------------------------------------------
-- 11. Repair tickets
-- ---------------------------------------------------------------------------
CREATE TABLE public.repair_tickets (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_number              text UNIQUE,          -- REP-YYYY-000001
  customer_id             uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  technician_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  shift_id                uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  -- Device info
  device                  text NOT NULL,
  brand                   text,
  model                   text,
  imei                    text,
  serial_number           text,
  device_condition        jsonb,               -- checklist: {screen_cracked, body_damage, ...}
  accessories_received    text[],              -- ['charging_cable','case',...]
  -- NOTE: passcodes must NEVER be stored; use a reference note only
  unlock_reference        text,               -- e.g. "pin left with device" — not the PIN itself
  -- Repair details
  issue                   text NOT NULL,
  method                  text NOT NULL DEFAULT 'walk-in'
                            CHECK (method IN ('walk-in','door-to-door','mail-in')),
  status                  public.repair_status NOT NULL DEFAULT 'pending',
  -- Pricing in pence
  labour_price_pence      bigint NOT NULL DEFAULT 0 CHECK (labour_price_pence >= 0),
  collection_charge_pence bigint NOT NULL DEFAULT 0 CHECK (collection_charge_pence >= 0),
  total_price_pence       bigint NOT NULL DEFAULT 0 CHECK (total_price_pence >= 0),
  -- Estimate & approval
  estimate_approved       boolean NOT NULL DEFAULT false,
  estimate_approved_at    timestamptz,
  estimate_approved_by    text,               -- e.g. "verbal" or "via WhatsApp"
  -- Payments
  deposit_pence           bigint NOT NULL DEFAULT 0 CHECK (deposit_pence >= 0),
  amount_paid_pence       bigint NOT NULL DEFAULT 0 CHECK (amount_paid_pence >= 0),
  -- Warranty
  warranty_days           integer,            -- NULL = use store default
  warranty_until          date,               -- set once on first completion
  -- Notes
  notes                   text,
  internal_notes          text,
  created_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_tickets ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.repair_tickets TO authenticated;
GRANT ALL ON public.repair_tickets TO service_role;

CREATE TRIGGER repairs_updated_at
  BEFORE UPDATE ON public.repair_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_repairs_status    ON public.repair_tickets(status);
CREATE INDEX idx_repairs_customer  ON public.repair_tickets(customer_id);
CREATE INDEX idx_repairs_tech      ON public.repair_tickets(technician_id);
CREATE INDEX idx_repairs_created   ON public.repair_tickets(created_at DESC);

-- IMEI/serial uniqueness only if non-null and not empty (they're searchable but a phone
-- can return for multiple repairs, so we index for search, not enforce uniqueness)
CREATE INDEX idx_repairs_imei ON public.repair_tickets(imei) WHERE imei IS NOT NULL;

CREATE POLICY "repairs_admin_staff_read"
  ON public.repair_tickets FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff') OR
    (public.has_role(auth.uid(), 'technician') AND technician_id = auth.uid())
  );

CREATE POLICY "repairs_admin_staff_insert"
  ON public.repair_tickets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "repairs_admin_staff_update"
  ON public.repair_tickets FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff') OR
    (public.has_role(auth.uid(), 'technician') AND technician_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff') OR
    (public.has_role(auth.uid(), 'technician') AND technician_id = auth.uid())
  );

CREATE POLICY "repairs_admin_delete"
  ON public.repair_tickets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Repair status history (append-only)
CREATE TABLE public.repair_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id   uuid NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  from_status public.repair_status,
  to_status   public.repair_status NOT NULL,
  note        text,
  changed_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_status_history ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.repair_status_history TO authenticated;
GRANT ALL ON public.repair_status_history TO service_role;

CREATE INDEX idx_repair_status_hist ON public.repair_status_history(repair_id, changed_at DESC);

CREATE POLICY "repair_status_hist_read"
  ON public.repair_status_history FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff') OR
    public.has_role(auth.uid(), 'technician')
  );

-- Repair estimates
CREATE TABLE public.repair_estimates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id        uuid NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  labour_pence     bigint NOT NULL DEFAULT 0 CHECK (labour_pence >= 0),
  parts_pence      bigint NOT NULL DEFAULT 0 CHECK (parts_pence >= 0),
  total_pence      bigint NOT NULL DEFAULT 0 CHECK (total_pence >= 0),
  notes            text,
  is_approved      boolean NOT NULL DEFAULT false,
  approved_at      timestamptz,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_estimates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.repair_estimates TO authenticated;
GRANT ALL ON public.repair_estimates TO service_role;

CREATE POLICY "repair_estimates_read"
  ON public.repair_estimates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'technician'));

CREATE POLICY "repair_estimates_write"
  ON public.repair_estimates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'technician'));

CREATE POLICY "repair_estimates_update"
  ON public.repair_estimates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Repair parts issued (idempotency-keyed to prevent duplicate deductions)
CREATE TABLE public.repair_parts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key  text UNIQUE NOT NULL,
  repair_id        uuid NOT NULL REFERENCES public.repair_tickets(id) ON DELETE RESTRICT,
  product_id       uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name     text NOT NULL,
  quantity         integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_cost_pence  bigint NOT NULL DEFAULT 0 CHECK (unit_cost_pence >= 0),
  is_returned      boolean NOT NULL DEFAULT false,
  returned_at      timestamptz,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_parts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.repair_parts TO authenticated;
GRANT ALL ON public.repair_parts TO service_role;

CREATE INDEX idx_repair_parts_repair ON public.repair_parts(repair_id);

CREATE POLICY "repair_parts_read"
  ON public.repair_parts FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff') OR
    public.has_role(auth.uid(), 'technician')
  );

-- Repair payments (full audit, supports partial/split/deposit)
CREATE TABLE public.repair_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text UNIQUE NOT NULL,
  repair_id       uuid NOT NULL REFERENCES public.repair_tickets(id) ON DELETE RESTRICT,
  amount_pence    bigint NOT NULL CHECK (amount_pence > 0),
  method          public.payment_method_type NOT NULL DEFAULT 'cash',
  is_deposit      boolean NOT NULL DEFAULT false,
  shift_id        uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  notes           text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.repair_payments TO authenticated;
GRANT ALL ON public.repair_payments TO service_role;

CREATE INDEX idx_repair_payments_repair ON public.repair_payments(repair_id);

CREATE POLICY "repair_payments_read"
  ON public.repair_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Repair warranty claims
CREATE TABLE public.repair_warranty_claims (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id   uuid NOT NULL REFERENCES public.repair_tickets(id) ON DELETE RESTRICT,
  description text NOT NULL,
  status      text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','investigating','resolved','rejected')),
  resolution  text,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.repair_warranty_claims ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.repair_warranty_claims TO authenticated;
GRANT ALL ON public.repair_warranty_claims TO service_role;

CREATE POLICY "warranty_claims_read"
  ON public.repair_warranty_claims FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "warranty_claims_write"
  ON public.repair_warranty_claims FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "warranty_claims_update"
  ON public.repair_warranty_claims FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 12. Purchase orders & goods receipts
-- ---------------------------------------------------------------------------
CREATE TABLE public.purchase_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number    text UNIQUE,
  supplier_id  uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  status       public.po_status NOT NULL DEFAULT 'draft',
  total_pence  bigint NOT NULL DEFAULT 0 CHECK (total_pence >= 0),
  notes        text,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;

CREATE TRIGGER pos_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_po_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_po_status   ON public.purchase_orders(status);
CREATE INDEX idx_po_created  ON public.purchase_orders(created_at DESC);

CREATE POLICY "po_staff_read"
  ON public.purchase_orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "po_staff_write"
  ON public.purchase_orders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "po_staff_update"
  ON public.purchase_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "po_admin_delete"
  ON public.purchase_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.purchase_order_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id   uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id          uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name        text NOT NULL,
  qty_ordered         integer NOT NULL DEFAULT 1 CHECK (qty_ordered > 0),
  qty_received        integer NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
  unit_cost_pence     bigint NOT NULL DEFAULT 0 CHECK (unit_cost_pence >= 0),
  line_total_pence    bigint NOT NULL DEFAULT 0 CHECK (line_total_pence >= 0),
  created_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;

CREATE INDEX idx_po_items_po ON public.purchase_order_items(purchase_order_id);

CREATE POLICY "po_items_staff_read"
  ON public.purchase_order_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "po_items_staff_write"
  ON public.purchase_order_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "po_items_staff_update"
  ON public.purchase_order_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Goods receipts (partial receiving)
CREATE TABLE public.goods_receipts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number         text UNIQUE,
  purchase_order_id  uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  idempotency_key    text UNIQUE NOT NULL,
  notes              text,
  received_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  received_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.goods_receipts TO authenticated;
GRANT ALL ON public.goods_receipts TO service_role;

CREATE INDEX idx_grn_po ON public.goods_receipts(purchase_order_id);

CREATE POLICY "grn_staff_read"
  ON public.goods_receipts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TABLE public.goods_receipt_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id           uuid NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  po_item_id       uuid NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE RESTRICT,
  qty_received     integer NOT NULL CHECK (qty_received > 0),
  unit_cost_pence  bigint NOT NULL DEFAULT 0 CHECK (unit_cost_pence >= 0)
);
ALTER TABLE public.goods_receipt_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.goods_receipt_items TO authenticated;
GRANT ALL ON public.goods_receipt_items TO service_role;

CREATE POLICY "grn_items_staff_read"
  ON public.goods_receipt_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Supplier payments
CREATE TABLE public.supplier_payments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id        uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  purchase_order_id  uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  amount_pence       bigint NOT NULL CHECK (amount_pence > 0),
  method             public.payment_method_type NOT NULL DEFAULT 'bank_transfer',
  payment_date       date NOT NULL DEFAULT CURRENT_DATE,
  reference          text,
  notes              text,
  created_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.supplier_payments TO authenticated;
GRANT ALL ON public.supplier_payments TO service_role;

CREATE INDEX idx_supplier_payments_supplier ON public.supplier_payments(supplier_id, payment_date DESC);

CREATE POLICY "supplier_payments_staff_read"
  ON public.supplier_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ---------------------------------------------------------------------------
-- 13. Stock movements (append-only, never UPDATE or DELETE)
-- ---------------------------------------------------------------------------
CREATE TABLE public.stock_movements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  movement_type public.movement_type NOT NULL,
  qty_change    integer NOT NULL,           -- positive = in, negative = out
  qty_before    integer NOT NULL,           -- snapshot before this movement
  qty_after     integer NOT NULL,           -- snapshot after this movement
  unit_cost_pence bigint,                   -- cost at time of movement
  reason        text NOT NULL,
  note          text,
  ref_id        uuid,                       -- sale_id, repair_id, po_id, etc.
  adj_number    text,                       -- ADJ-YYYY-000001 if applicable
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;

CREATE INDEX idx_stock_movements_product  ON public.stock_movements(product_id, created_at DESC);
CREATE INDEX idx_stock_movements_ref      ON public.stock_movements(ref_id) WHERE ref_id IS NOT NULL;

CREATE POLICY "stock_movements_staff_read"
  ON public.stock_movements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- ---------------------------------------------------------------------------
-- 14. Expenses (soft-delete via void, never hard-delete)
-- ---------------------------------------------------------------------------
CREATE TABLE public.expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category     text NOT NULL,
  description  text NOT NULL,
  amount_pence bigint NOT NULL CHECK (amount_pence > 0),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  shift_id     uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  is_void      boolean NOT NULL DEFAULT false,
  void_reason  text,
  void_at      timestamptz,
  void_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

CREATE INDEX idx_expenses_date  ON public.expenses(expense_date DESC);
CREATE INDEX idx_expenses_shift ON public.expenses(shift_id);

CREATE POLICY "expenses_staff_read"
  ON public.expenses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "expenses_staff_insert"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Void is an UPDATE (set is_void=true), only admin can do it
CREATE POLICY "expenses_admin_update"
  ON public.expenses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 15. Audit events (append-only, no UPDATE/DELETE permitted via RLS)
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name  text NOT NULL,
  record_id   uuid,
  event_type  text NOT NULL CHECK (event_type IN (
    'create','update','delete','void','status_change',
    'stock_deduct','stock_restore','payment','login'
  )),
  payload     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;

CREATE INDEX idx_audit_events_table   ON public.audit_events(table_name, created_at DESC);
CREATE INDEX idx_audit_events_record  ON public.audit_events(record_id) WHERE record_id IS NOT NULL;

CREATE POLICY "audit_admin_read"
  ON public.audit_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 16. Public booking enquiries
-- ---------------------------------------------------------------------------
CREATE TABLE public.booking_enquiries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  phone          text NOT NULL CHECK (phone ~ '^[0-9+\-\s()]{7,20}$'),
  email          text          CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$' OR email IS NULL),
  device         text NOT NULL CHECK (char_length(device) BETWEEN 2 AND 100),
  brand          text          CHECK (char_length(brand) <= 60),
  issue          text NOT NULL CHECK (char_length(issue) BETWEEN 5 AND 2000),
  method         text NOT NULL DEFAULT 'walk-in'
                   CHECK (method IN ('walk-in','door-to-door','mail-in')),
  preferred_date date,
  preferred_slot text          CHECK (preferred_slot IN ('morning','afternoon','evening') OR preferred_slot IS NULL),
  address        text          CHECK (char_length(address) <= 300),
  status         text NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','contacted','booked','completed','cancelled')),
  staff_notes    text,
  repair_ticket_id uuid REFERENCES public.repair_tickets(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_enquiries ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.booking_enquiries TO anon;
GRANT SELECT, INSERT, UPDATE ON public.booking_enquiries TO authenticated;
GRANT ALL ON public.booking_enquiries TO service_role;

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.booking_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_bookings_status ON public.booking_enquiries(status);

-- Anon public submission — validated by CHECK constraints above
-- Rate-limit: max 3 new bookings per phone in last 24 hours
CREATE OR REPLACE FUNCTION public.check_booking_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.booking_enquiries
  WHERE phone = NEW.phone
    AND created_at > now() - interval '24 hours';

  IF recent_count >= 3 THEN
    RAISE EXCEPTION 'Rate limit: maximum 3 booking enquiries per 24 hours per phone number';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER booking_rate_limit_check
  BEFORE INSERT ON public.booking_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_rate_limit();

CREATE POLICY "bookings_anon_insert"
  ON public.booking_enquiries FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "bookings_staff_read"
  ON public.booking_enquiries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "bookings_staff_update"
  ON public.booking_enquiries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "bookings_staff_insert"
  ON public.booking_enquiries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
