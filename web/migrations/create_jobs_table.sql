-- Migration: Create Jobs Module tables
-- Date: 2026-04-11
-- Description: Creates jobs, job_time_entries, job_parts tables,
--              the generate_job_number() function, and adds
--              converted_to_job_id to quotes.
-- All statements are idempotent (safe to re-run).

-- =============================================================================
-- 1. generate_job_number(org_id UUID) function
-- DROP first — CREATE OR REPLACE cannot change an existing function's return type
-- =============================================================================
DROP FUNCTION IF EXISTS generate_job_number(UUID);
CREATE OR REPLACE FUNCTION generate_job_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(REGEXP_REPLACE(job_number, '[^0-9]', '', 'g'), '') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM jobs
  WHERE organisation_id = org_id;

  RETURN 'JB-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. jobs table
-- =============================================================================
CREATE TABLE IF NOT EXISTS jobs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id        UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_number             TEXT NOT NULL,
  title                  TEXT NOT NULL,
  description            TEXT,
  status                 TEXT NOT NULL DEFAULT 'scheduled',
    CONSTRAINT jobs_status_check CHECK (
      status IN ('scheduled','in_progress','on_hold','completed','invoiced','cancelled')
    ),
  quote_id               UUID REFERENCES quotes(id) ON DELETE SET NULL,
  ticket_id              UUID REFERENCES tickets(id) ON DELETE SET NULL,
  contact_id             UUID REFERENCES contacts(id) ON DELETE SET NULL,
  scheduled_start        TIMESTAMPTZ,
  scheduled_end          TIMESTAMPTZ,
  actual_start           TIMESTAMPTZ,
  actual_end             TIMESTAMPTZ,
  assigned_to            UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by             UUID NOT NULL REFERENCES users(id),
  notes                  TEXT,
  -- Forward reference to invoices — FK added when invoices table is created
  converted_to_invoice_id UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organisation_id, job_number)
);

-- Index: list jobs by org + status (primary list-view query)
CREATE INDEX IF NOT EXISTS idx_jobs_org_status
  ON jobs (organisation_id, status);

-- Index: look up jobs by contact
CREATE INDEX IF NOT EXISTS idx_jobs_contact
  ON jobs (contact_id)
  WHERE contact_id IS NOT NULL;

-- Index: look up jobs by quote (for convert-to-job checks)
CREATE INDEX IF NOT EXISTS idx_jobs_quote
  ON jobs (quote_id)
  WHERE quote_id IS NOT NULL;

-- Index: look up jobs by ticket
CREATE INDEX IF NOT EXISTS idx_jobs_ticket
  ON jobs (ticket_id)
  WHERE ticket_id IS NOT NULL;

-- =============================================================================
-- 3. job_time_entries table
-- =============================================================================
CREATE TABLE IF NOT EXISTS job_time_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id),
  description       TEXT,
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  -- Source of truth for billing. Computed from start/end when both are set,
  -- or entered manually for retrospective logging.
  duration_minutes  INT NOT NULL DEFAULT 0,
  billable          BOOLEAN NOT NULL DEFAULT TRUE,
  -- Null means "use the organisation's default hourly rate" (resolved at invoice time)
  hourly_rate       NUMERIC(10,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_time_entries_job
  ON job_time_entries (job_id);

-- =============================================================================
-- 4. job_parts table
-- =============================================================================
CREATE TABLE IF NOT EXISTS job_parts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  -- Null for ad-hoc parts not in the product catalogue
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
  description       TEXT NOT NULL,
  quantity          NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit              TEXT,
  unit_cost         NUMERIC(10,2),
  unit_price        NUMERIC(10,2),
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_parts_job
  ON job_parts (job_id);

-- =============================================================================
-- 5. Add converted_to_job_id to quotes
--    (referenced by the existing convert-to-job handler in quotes.js)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'converted_to_job_id'
  ) THEN
    ALTER TABLE quotes ADD COLUMN converted_to_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
  END IF;
END $$;
