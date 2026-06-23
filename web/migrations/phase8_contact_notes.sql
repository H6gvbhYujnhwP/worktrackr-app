-- Phase 8 (Leads) — per-company notes log (free-text notes + logged emails).
-- These power the slide-over Notes panel on a lead and also appear in the
-- company profile's activity timeline. Kept separate from crm_events so notes
-- never appear on the Calendar. Idempotent. No money figures.
-- Filename 'phase8_' sorts after phase7, so it runs last on boot.

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

CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON contact_notes(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_notes_org     ON contact_notes(organisation_id);
