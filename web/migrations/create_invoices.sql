-- Migration: Create Invoices module tables
-- Date: 2026-04-12
-- Description: Creates invoices and invoice_lines tables,
--              the generate_invoice_number() function, and wires up
--              the pre-existing jobs.converted_to_invoice_id FK.
-- All statements are idempotent (safe to re-run).

-- =============================================================================
-- 1. generate_invoice_number(org_id UUID) function
-- =============================================================================
DROP FUNCTION IF EXISTS generate_invoice_number(UUID);
CREATE OR REPLACE FUNCTION generate_invoice_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(REGEXP_REPLACE(invoice_number, '[^0-9]', '', 'g'), '') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM invoices
  WHERE organisation_id = org_id;

  RETURN 'INV-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. invoices table
-- =============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  -- job_id FK added conditionally in step 5 (invoices migrates before jobs alphabetically)
  job_id            UUID,
  contact_id        UUID REFERENCES contacts(id) ON DELETE SET NULL,
  invoice_number    TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft',
    CONSTRAINT invoices_status_check CHECK (
      status IN ('draft', 'sent', 'paid', 'overdue')
    ),
  issue_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date          DATE,
  subtotal          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  vat_total         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organisation_id, invoice_number)
);

-- Index: list invoices by org + status (primary list-view query)
CREATE INDEX IF NOT EXISTS idx_invoices_org_status
  ON invoices (organisation_id, status);

-- Index: look up invoices by contact
CREATE INDEX IF NOT EXISTS idx_invoices_contact
  ON invoices (contact_id)
  WHERE contact_id IS NOT NULL;

-- Index: look up invoice for a given job
CREATE INDEX IF NOT EXISTS idx_invoices_job
  ON invoices (job_id)
  WHERE job_id IS NOT NULL;

-- =============================================================================
-- 3. invoice_lines table
-- =============================================================================
CREATE TABLE IF NOT EXISTS invoice_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  quantity        NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  line_total      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  vat_applicable  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice
  ON invoice_lines (invoice_id);

-- =============================================================================
-- 4. Wire up jobs.converted_to_invoice_id → invoices
-- The column already exists (added in create_jobs_table.sql with no FK).
-- We add the FK constraint here now that the invoices table exists.
-- Guard handles fresh-DB setups where invoices runs before jobs alphabetically.
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'jobs'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'jobs_converted_to_invoice_id_fkey'
        AND table_name = 'jobs'
    ) THEN
      ALTER TABLE jobs
        ADD CONSTRAINT jobs_converted_to_invoice_id_fkey
        FOREIGN KEY (converted_to_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- =============================================================================
-- 5. Wire up invoices.job_id → jobs
-- Same guard for fresh-DB setup.
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'jobs'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'invoices_job_id_fkey'
        AND table_name = 'invoices'
    ) THEN
      ALTER TABLE invoices
        ADD CONSTRAINT invoices_job_id_fkey
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;
