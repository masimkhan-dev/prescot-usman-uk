
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS warranty_days integer NOT NULL DEFAULT 0;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS warranty_until date,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.repair_tickets
  ADD COLUMN IF NOT EXISTS warranty_until date,
  ADD COLUMN IF NOT EXISTS labour_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false;

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_change integer NOT NULL,
  reason text NOT NULL,
  note text,
  ref_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage stock movements"
  ON public.stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id, created_at DESC);

CREATE TABLE public.repair_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id uuid NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repair_parts TO authenticated;
GRANT ALL ON public.repair_parts TO service_role;
ALTER TABLE public.repair_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage repair parts"
  ON public.repair_parts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_repair_parts_repair ON public.repair_parts(repair_id);
