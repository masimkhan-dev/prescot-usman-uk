-- =============================================================================
-- MIGRATION 004: default_settings + admin bootstrap
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Default store settings
-- OWNER CONFIRM items are marked — do not activate without owner decision
-- ---------------------------------------------------------------------------
INSERT INTO public.store_settings (key, value) VALUES
  ('business_name',              'Prescot Mobiles & Computers Services'),
  ('address_line',               '57 Eccleston Street, Prescot L34 5QH'),
  ('email',                      'precotmobiles2026@gmail.com'),
  ('phone',                      '+44 7479 385163'),
  ('whatsapp',                   '+44 7479 385163'),
  ('timezone',                   'Europe/London'),
  ('currency',                   'GBP'),
  -- OWNER CONFIRM OC-01: Set to 'true' and provide vat_number / vat_rate before live invoicing
  ('vat_registered',             'false'),
  ('vat_number',                 ''),
  ('vat_rate_percent',           ''),
  -- OWNER CONFIRM OC-09: Set company number if registered at Companies House
  ('company_number',             ''),
  -- OWNER CONFIRM OC-02: Set warranty period in days (e.g. '90' or '365')
  -- No default shown on receipts until this is explicitly set by owner
  ('default_warranty_days',      ''),
  ('allow_negative_stock',       'false'),
  ('require_adj_approval',       'true'),
  -- OWNER CONFIRM OC-10: Set door-to-door charge in pence (e.g. '1000' for £10.00)
  ('door_to_door_charge_pence',  '0'),
  ('receipt_footer',             'Thank you for choosing Prescot Mobiles!'),
  ('invoice_prefix',             'INV'),
  ('repair_prefix',              'REP'),
  ('credit_note_prefix',         'CRN'),
  ('po_prefix',                  'PO'),
  ('grn_prefix',                 'GRN'),
  ('adj_prefix',                 'ADJ')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ---------------------------------------------------------------------------
-- 2. Admin bootstrap function
-- Run ONCE after first Supabase Auth user is created:
--   SELECT public.bootstrap_admin('your-auth-user-uuid-here');
--
-- Safety rules:
--   - Requires an explicit UUID — never auto-promotes
--   - Errors if admin already exists
--   - Errors if UUID does not exist in auth.users
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bootstrap_admin(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_admin integer;
BEGIN
  -- Check user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User % does not exist in auth.users. Create the user via Supabase Dashboard first.', p_user_id;
  END IF;

  -- Refuse if any admin already exists
  SELECT COUNT(*) INTO v_existing_admin
  FROM public.user_roles WHERE role = 'admin';

  IF v_existing_admin > 0 THEN
    RAISE EXCEPTION 'An admin already exists. Use the admin UI to grant roles to additional users.';
  END IF;

  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN 'Admin role granted to user ' || p_user_id::text ||
         '. Log in and go to Dashboard → Users to manage further roles.';
END;
$$;

-- Only service_role can call bootstrap_admin (run via Supabase SQL editor)
REVOKE ALL ON FUNCTION public.bootstrap_admin FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_admin FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Pre-populate document_sequences for current year
-- ---------------------------------------------------------------------------
INSERT INTO public.document_sequences (doc_type, year, last_seq)
SELECT unnest(ARRAY['INV','CRN','REP','PO','GRN','ADJ']::public.doc_type[]),
       EXTRACT(YEAR FROM now())::integer,
       0
ON CONFLICT (doc_type, year) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Verification queries (run manually after applying)
-- ---------------------------------------------------------------------------
-- SELECT COUNT(*) FROM public.store_settings;   -- should be 21
-- SELECT * FROM public.store_settings ORDER BY key;
-- SELECT * FROM public.document_sequences;      -- should have 6 rows for current year
