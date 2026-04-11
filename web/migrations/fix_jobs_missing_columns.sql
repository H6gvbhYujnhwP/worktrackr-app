-- Migration: Add missing columns to pre-existing jobs table
-- Date: 2026-04-11
-- The jobs table existed before create_jobs_table.sql ran.
-- CREATE TABLE IF NOT EXISTS skipped our full column definition.
-- This migration safely adds every column we need, one at a time.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='assigned_to') THEN
    ALTER TABLE jobs ADD COLUMN assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='ticket_id') THEN
    ALTER TABLE jobs ADD COLUMN ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='actual_start') THEN
    ALTER TABLE jobs ADD COLUMN actual_start TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='actual_end') THEN
    ALTER TABLE jobs ADD COLUMN actual_end TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='converted_to_invoice_id') THEN
    ALTER TABLE jobs ADD COLUMN converted_to_invoice_id UUID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='updated_at') THEN
    ALTER TABLE jobs ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='created_at') THEN
    ALTER TABLE jobs ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Indexes (all IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_jobs_org_status ON jobs (organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_contact    ON jobs (contact_id)  WHERE contact_id  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_quote      ON jobs (quote_id)    WHERE quote_id    IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_ticket     ON jobs (ticket_id)   WHERE ticket_id   IS NOT NULL;
