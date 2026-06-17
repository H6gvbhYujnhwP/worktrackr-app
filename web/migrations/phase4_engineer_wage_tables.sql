-- Engineer wage progression — per engineer, manager-driven, NO hardcoded money.
-- Same principle as commission (§1): the org sets stage length + deal-count target
-- (engineer_wage_settings), and every £ figure (current rate, rise, new rate) is a
-- manual field a manager enters/confirms. The delivered-deal count is a neutral
-- integer; engineers never see profit or commission anywhere.
-- Defaults are all 0 / disabled. Filename 'phase4_' sorts after create_* tables.
-- Idempotent.

CREATE TABLE IF NOT EXISTS engineer_wage_settings (
  organisation_id UUID PRIMARY KEY REFERENCES organisations(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { stageMonths, dealCountTarget }
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS engineer_wage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  engineer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage_no INTEGER NOT NULL DEFAULT 1,
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  current_rate NUMERIC NOT NULL DEFAULT 0,     -- manual £ (org decides the unit: hourly/annual)
  deals_delivered INTEGER NOT NULL DEFAULT 0,  -- neutral count, manager-entered
  deal_target INTEGER NOT NULL DEFAULT 0,      -- snapshot of the target for this stage
  rise_amount NUMERIC NOT NULL DEFAULT 0,      -- manual £ rise
  new_rate NUMERIC NOT NULL DEFAULT 0,         -- manual £ rate after the rise
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','confirmed')),
  note TEXT,
  confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eng_wage_lookup ON engineer_wage_records(organisation_id, engineer_user_id, status);
