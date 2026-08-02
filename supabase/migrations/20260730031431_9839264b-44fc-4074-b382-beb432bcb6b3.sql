-- SALE RETURNS
CREATE TABLE public.sale_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  total numeric NOT NULL DEFAULT 0,
  reason text,
  refund_method text NOT NULL DEFAULT 'cash',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_returns TO authenticated;
GRANT ALL ON public.sale_returns TO service_role;
ALTER TABLE public.sale_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage sale returns" ON public.sale_returns FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.sale_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.sale_returns(id) ON DELETE CASCADE,
  sale_item_id uuid,
  product_id uuid,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_return_items TO authenticated;
GRANT ALL ON public.sale_return_items TO service_role;
ALTER TABLE public.sale_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage sale return items" ON public.sale_return_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SHIFTS
CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_by uuid,
  closed_by uuid,
  opening_float numeric NOT NULL DEFAULT 0,
  counted_cash numeric,
  expected_cash numeric,
  difference numeric,
  cash_sales numeric NOT NULL DEFAULT 0,
  card_sales numeric NOT NULL DEFAULT 0,
  bank_sales numeric NOT NULL DEFAULT 0,
  refunds_total numeric NOT NULL DEFAULT 0,
  expenses_total numeric NOT NULL DEFAULT 0,
  sales_count integer NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage shifts" ON public.shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- SUPPLIERS
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- PURCHASE ORDERS
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  reference text,
  status text NOT NULL DEFAULT 'draft',
  total numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage purchase orders" ON public.purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage purchase order items" ON public.purchase_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- BOOKINGS
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  device text NOT NULL,
  brand text,
  issue text NOT NULL,
  method text NOT NULL DEFAULT 'walk-in',
  preferred_date date,
  preferred_slot text,
  address text,
  status text NOT NULL DEFAULT 'new',
  staff_notes text,
  repair_ticket_id uuid REFERENCES public.repair_tickets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT INSERT ON public.bookings TO anon;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage bookings" ON public.bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can submit a booking" ON public.bookings FOR INSERT TO anon WITH CHECK (true);
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();