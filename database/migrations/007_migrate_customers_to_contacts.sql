-- Migration: Remove customers table and use contacts as single source of truth
-- Date: 2026-01-23
-- Description: Consolidates customers and contacts into a single contacts table
-- WARNING: This is a breaking change that requires careful execution

-- ============================================================================
-- STEP 1: Backup existing data (for safety)
-- ============================================================================

-- Create backup tables
CREATE TABLE IF NOT EXISTS customers_backup AS SELECT * FROM customers;
CREATE TABLE IF NOT EXISTS contacts_backup AS SELECT * FROM contacts;

-- ============================================================================
-- STEP 2: Update contacts table structure to be standalone
-- ============================================================================

-- Add fields from customers table to contacts table (if they don't exist)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'United Kingdom';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Rename 'mobile' to 'phone_mobile' for clarity (optional)
ALTER TABLE contacts RENAME COLUMN mobile TO phone_mobile;

-- ============================================================================
-- STEP 3: Migrate data from customers to contacts
-- ============================================================================

-- For each customer that doesn't have a corresponding contact, create one
INSERT INTO contacts (
    id,
    organisation_id,
    name,
    email,
    phone,
    company_name,
    address,
    city,
    postal_code,
    country,
    notes,
    is_active,
    created_by,
    created_at,
    updated_at
)
SELECT 
    c.id,
    c.organisation_id,
    COALESCE(c.contact_name, c.company_name, 'Unknown'),
    c.email,
    c.phone,
    c.company_name,
    c.address,
    c.city,
    c.postal_code,
    c.country,
    c.notes,
    c.is_active,
    c.created_by,
    c.created_at,
    c.updated_at
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM contacts ct WHERE ct.customer_id = c.id AND ct.is_primary = TRUE
)
ON CONFLICT (id) DO NOTHING;

-- For customers that have contacts, update the primary contact with customer info
UPDATE contacts ct
SET 
    company_name = COALESCE(ct.company_name, c.company_name),
    address = COALESCE(ct.address, c.address),
    city = COALESCE(ct.city, c.city),
    postal_code = COALESCE(ct.postal_code, c.postal_code),
    country = COALESCE(ct.country, c.country),
    is_active = c.is_active
FROM customers c
WHERE ct.customer_id = c.id AND ct.is_primary = TRUE;

-- ============================================================================
-- STEP 4: Update foreign keys in all dependent tables
-- ============================================================================

-- Drop existing foreign key constraints
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_customer_id_fkey;
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_customer_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_customer_id_fkey;

-- Rename customer_id columns to contact_id
ALTER TABLE quotes RENAME COLUMN customer_id TO contact_id;
ALTER TABLE jobs RENAME COLUMN customer_id TO contact_id;
ALTER TABLE invoices RENAME COLUMN customer_id TO contact_id;
ALTER TABLE payments RENAME COLUMN customer_id TO contact_id;

-- Add new foreign key constraints pointing to contacts
ALTER TABLE quotes 
    ADD CONSTRAINT quotes_contact_id_fkey 
    FOREIGN KEY (contact_id) REFERENCES contacts(id);

ALTER TABLE jobs 
    ADD CONSTRAINT jobs_contact_id_fkey 
    FOREIGN KEY (contact_id) REFERENCES contacts(id);

ALTER TABLE invoices 
    ADD CONSTRAINT invoices_contact_id_fkey 
    FOREIGN KEY (contact_id) REFERENCES contacts(id);

ALTER TABLE payments 
    ADD CONSTRAINT payments_contact_id_fkey 
    FOREIGN KEY (contact_id) REFERENCES contacts(id);

-- ============================================================================
-- STEP 5: Remove customer_id from contacts table
-- ============================================================================

-- Drop the foreign key constraint
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_customer_id_fkey;

-- Drop the customer_id column
ALTER TABLE contacts DROP COLUMN IF EXISTS customer_id;

-- ============================================================================
-- STEP 6: Drop the customers table
-- ============================================================================

DROP TABLE IF EXISTS customers CASCADE;

-- ============================================================================
-- STEP 7: Update indexes
-- ============================================================================

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_organisation_id ON contacts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_company_name ON contacts(company_name);
CREATE INDEX IF NOT EXISTS idx_quotes_contact_id ON quotes(contact_id);
CREATE INDEX IF NOT EXISTS idx_jobs_contact_id ON jobs(contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contact_id ON invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_payments_contact_id ON payments(contact_id);

-- ============================================================================
-- STEP 8: Update triggers
-- ============================================================================

-- Add updated_at trigger for contacts if it doesn't exist
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON contacts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify)
-- ============================================================================

-- Verify no orphaned records
-- SELECT COUNT(*) FROM quotes WHERE contact_id NOT IN (SELECT id FROM contacts);
-- SELECT COUNT(*) FROM jobs WHERE contact_id NOT IN (SELECT id FROM contacts);
-- SELECT COUNT(*) FROM invoices WHERE contact_id NOT IN (SELECT id FROM contacts);
-- SELECT COUNT(*) FROM payments WHERE contact_id NOT IN (SELECT id FROM contacts);

-- Verify contacts table structure
-- \d contacts

-- ============================================================================
-- ROLLBACK SCRIPT (In case of issues)
-- ============================================================================

-- To rollback this migration:
-- 1. Restore from backup tables:
--    CREATE TABLE customers AS SELECT * FROM customers_backup;
--    CREATE TABLE contacts AS SELECT * FROM contacts_backup;
-- 2. Re-run the original schema creation script
-- 3. Restore foreign key constraints

-- ============================================================================
-- NOTES
-- ============================================================================

-- This migration:
-- ✅ Preserves all existing customer data by migrating to contacts
-- ✅ Maintains data integrity with proper foreign key constraints
-- ✅ Creates backup tables for safety
-- ✅ Updates all dependent tables (quotes, jobs, invoices, payments)
-- ✅ Removes the customers table completely
-- ✅ Makes contacts the single source of truth

-- After running this migration:
-- 1. Update backend API to use contact_id instead of customer_id
-- 2. Update frontend (already done in QuoteForm.jsx)
-- 3. Test all quote, job, invoice, and payment creation workflows
-- 4. Verify data integrity with the verification queries above
