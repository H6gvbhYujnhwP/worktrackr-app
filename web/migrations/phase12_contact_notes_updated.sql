-- Phase 12 — notes become editable, so record WHEN one was last changed.
--
-- Without this the timeline would still show a note's original time after an
-- edit, quietly misrepresenting when the information was actually written.
--
-- ⚠️ ORDERING NOTE — read before adding migrations here.
-- run-migrations.js sorts filenames ALPHABETICALLY, not numerically, so the
-- real run order is: … phase10_, phase11_, phase12_, phase4_ … phase8_, phase9_
-- That means THIS FILE RUNS BEFORE phase8_contact_notes.sql, which is the file
-- that creates contact_notes. On the live database the table already exists so
-- a bare ALTER would work, but on a FRESH database it would blow up.
--
-- So this migration is deliberately SELF-SUFFICIENT and order-independent:
-- it creates the table if it isn't there yet (identical definition to phase8,
-- which then no-ops), and adds the column only if missing. Safe to run in
-- either order, and safe to run repeatedly.
--
-- Idempotent. No money figures.

CREATE TABLE IF NOT EXISTS contact_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL DEFAULT 'note' CHECK (kind IN ('note', 'email')),
  subject         TEXT,
  body            TEXT NOT NULL DEFAULT '',
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE contact_notes ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;
