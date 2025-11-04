-- WorkTrackr Phase 1 Migration ROLLBACK Script
-- Version: 1.0.0
-- Date: 2025-11-04
-- Description: Safely rolls back all Phase 1 changes

-- ============================================================================
-- WARNING: This will delete all data in the new tables!
-- ============================================================================

BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_invoice_status ON payment_allocations;
DROP TRIGGER IF EXISTS update_accounting_integrations_updated_at ON accounting_integrations;
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;

-- Drop functions
DROP FUNCTION IF EXISTS update_invoice_status();
DROP FUNCTION IF EXISTS generate_payment_number(UUID);
DROP FUNCTION IF EXISTS generate_invoice_number(UUID);
DROP FUNCTION IF EXISTS generate_job_number(UUID);
DROP FUNCTION IF EXISTS generate_quote_number(UUID);

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS accounting_sync_log CASCADE;
DROP TABLE IF EXISTS accounting_integrations CASCADE;
DROP TABLE IF EXISTS review_photos CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS payment_allocations CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoice_lines CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS job_time_entries CASCADE;
DROP TABLE IF EXISTS job_photos CASCADE;
DROP TABLE IF EXISTS job_materials CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS quote_acceptance CASCADE;
DROP TABLE IF EXISTS quote_lines CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

COMMIT;

-- Log rollback completion
DO $$
BEGIN
    RAISE NOTICE 'WorkTrackr Phase 1 Migration ROLLED BACK!';
    RAISE NOTICE 'All Phase 1 tables, triggers, and functions have been removed.';
END $$;

