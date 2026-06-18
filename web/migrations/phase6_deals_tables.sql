-- Phase 6 (slim) — Deals / opportunities.
-- A deal is one potential sale on a company (a contacts row, type='company' —
-- never the dropped customers table). Deliberately lightweight: title, value,
-- stage, expected close, owner, notes. No probability/weighting/win-rate — the
-- "forecast" is simply the sum of open deal values, computed in the app.
-- `value` is user-entered deal data, not a commission figure.
-- Filename 'phase6_' sorts after the phase5 migrations. Idempotent.

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,        -- the company
  title TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,                                  -- expected sale value (ex VAT)
  stage TEXT NOT NULL DEFAULT 'open'
    CHECK (stage IN ('open','in_progress','won','lost')),
  expected_close_date DATE,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,        -- salesperson
  notes TEXT,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_organisation ON deals(organisation_id, stage);
CREATE INDEX IF NOT EXISTS idx_deals_contact      ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner        ON deals(owner_user_id);
