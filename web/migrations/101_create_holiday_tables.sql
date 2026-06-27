-- Holiday / annual-leave management.
-- Three org-scoped tables (British spelling `organisation_id`):
--   holiday_settings   : one row per org — the company-wide holiday year + carry-over policy
--   holiday_allowances : one row per staff member — allowance, working week, carried-over days
--   holiday_requests   : each holiday booking/request, status + computed working-day count
-- All idempotent (CREATE ... IF NOT EXISTS) so a re-run on boot never crashes.
-- NUMERIC(5,1) everywhere days are stored, so half-days (x.5) are supported.

CREATE TABLE IF NOT EXISTS holiday_settings (
  organisation_id      UUID PRIMARY KEY,
  year_start           DATE,
  year_end             DATE,
  carry_over_allowed   BOOLEAN NOT NULL DEFAULT FALSE,
  carry_over_max_days  NUMERIC(5,1) NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS holiday_allowances (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL,
  user_id          UUID NOT NULL,
  allowance_days   NUMERIC(5,1),                              -- NULL = not set yet
  carry_over_days  NUMERIC(5,1) NOT NULL DEFAULT 0,
  working_days     VARCHAR(7) NOT NULL DEFAULT '1111100',     -- Mon..Sun, '1' = working day
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organisation_id, user_id)
);

CREATE TABLE IF NOT EXISTS holiday_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL,
  user_id          UUID NOT NULL,
  type             VARCHAR(20) NOT NULL DEFAULT 'holiday',
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  half_start       BOOLEAN NOT NULL DEFAULT FALSE,
  half_end         BOOLEAN NOT NULL DEFAULT FALSE,
  days             NUMERIC(5,1) NOT NULL DEFAULT 0,
  note             TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected','cancelled')),
  decided_by       UUID,
  decided_at       TIMESTAMPTZ,
  decision_note    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holiday_requests_org_user ON holiday_requests(organisation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_holiday_requests_status   ON holiday_requests(organisation_id, status);
