-- Commission engine — FULLY CONFIGURABLE, nothing hardcoded.
-- WorkTrackr ships no rates/deductions/thresholds; each organisation enters its
-- own in the admin "Commission rules" area (stored in commission_settings.config).
-- With no config, the engine computes nothing (neutral defaults = 0 / disabled).
-- Suggested amounts are computed live from orders + config; only manual overrides
-- and period approvals are persisted.
-- Filename starts 'phase4_' so it sorts AFTER create_orders_tables.sql (this file
-- references orders + alters the orders table). Idempotent.

-- Per-org rule config. config JSONB holds (all optional, neutral if absent):
--   enabled (bool), oneOffRate (% of profit after deduction), deductionPerSale (£ internal cost),
--   financeRate (%), referralRate (%), recurringRate (% — Contracts, Phase 5),
--   thresholdTurnover (£ paid turnover in period to unlock the bonus; 0 = no bonus),
--   bonusRate (% of period paid profit when threshold met),
--   periodStartDay (1-28, day of month the commission period starts).
CREATE TABLE IF NOT EXISTS commission_settings (
  organisation_id UUID PRIMARY KEY REFERENCES organisations(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional manual £ override for a single order's commission (manager-set).
-- "Every bonus/wage figure has a manual £ field" — this is that field for orders.
CREATE TABLE IF NOT EXISTS commission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  manual_amount NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  set_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manager approval/lock of a salesperson's commission for a given period.
CREATE TABLE IF NOT EXISTS commission_period_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  salesperson_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organisation_id, salesperson_user_id, period_start)
);

-- Which configured rate an order uses. Org/user picks on the order form.
-- 'standard' (one-off), 'finance', 'referral'. NULL is treated as 'standard'.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_category TEXT;

CREATE INDEX IF NOT EXISTS idx_commission_overrides_org ON commission_overrides(organisation_id);
CREATE INDEX IF NOT EXISTS idx_commission_locks_lookup ON commission_period_locks(organisation_id, salesperson_user_id, period_start);
