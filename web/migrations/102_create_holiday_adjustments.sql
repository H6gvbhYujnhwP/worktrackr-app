-- Holiday entitlement adjustments (overrides).
-- Each row is a one-off +/- tweak to a staff member's available holiday, with a
-- required reason, so every change to a balance is auditable. Examples:
--   +3.0  "extra days agreed with Sarah"
--   -1.0  "sick day 5 Jul taken off holiday"
-- A person's available days = base allowance + carried-over + SUM(adjustments).
-- Idempotent so a re-run on boot never crashes.

CREATE TABLE IF NOT EXISTS holiday_adjustments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL,
  user_id          UUID NOT NULL,
  days             NUMERIC(5,1) NOT NULL,   -- positive grants days, negative deducts
  reason           TEXT NOT NULL,
  created_by       UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holiday_adjustments_org_user ON holiday_adjustments(organisation_id, user_id);
