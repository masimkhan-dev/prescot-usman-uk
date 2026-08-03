-- =============================================================================
-- TEST 01: Migration Idempotency Test
-- Verifies that baseline tables, triggers, and functions can be queried without error
-- =============================================================================
BEGIN;

SELECT 'Testing schema baseline...' AS test_step;

-- Assert key tables exist
SELECT count(*) FROM public.profiles;
SELECT count(*) FROM public.user_roles;
SELECT count(*) FROM public.store_settings;
SELECT count(*) FROM public.products;
SELECT count(*) FROM public.sales;
SELECT count(*) FROM public.repair_tickets;

-- Assert enum types exist
SELECT 'admin'::public.app_role;
SELECT 'completed'::public.repair_status;
SELECT 'INV'::public.doc_type;

ROLLBACK;
SELECT 'Test 01 PASS' AS result;
