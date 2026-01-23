-- Complete Customer to Contact Migration - Remaining Steps
-- Run with: psql $DATABASE_URL -f database/migrations/007_complete_migration.sql

-- Step 6: Update Jobs Table
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_customer_id_fkey;
ALTER TABLE jobs RENAME COLUMN customer_id TO contact_id;
ALTER TABLE jobs ADD CONSTRAINT jobs_contact_id_fkey 
    FOREIGN KEY (contact_id) REFERENCES contacts(id);

-- Step 7: Update Invoices Table
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;
ALTER TABLE invoices RENAME COLUMN customer_id TO contact_id;
ALTER TABLE invoices ADD CONSTRAINT invoices_contact_id_fkey 
    FOREIGN KEY (contact_id) REFERENCES contacts(id);

-- Step 8: Update Payments Table
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_customer_id_fkey;
ALTER TABLE payments RENAME COLUMN customer_id TO contact_id;
ALTER TABLE payments ADD CONSTRAINT payments_contact_id_fkey 
    FOREIGN KEY (contact_id) REFERENCES contacts(id);

-- Step 9: Drop Customers Table
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS customers_backup CASCADE;

-- Step 10: Add Performance Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_contact_id ON quotes(contact_id);
CREATE INDEX IF NOT EXISTS idx_jobs_contact_id ON jobs(contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contact_id ON invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_payments_contact_id ON payments(contact_id);

-- Verification
SELECT 'Migration Complete!' as status;
SELECT COUNT(*) as total_contacts FROM contacts;
SELECT COUNT(*) as quotes_with_contact FROM quotes WHERE contact_id IS NOT NULL;
SELECT COUNT(*) as orphaned_quotes FROM quotes WHERE contact_id NOT IN (SELECT id FROM contacts);
