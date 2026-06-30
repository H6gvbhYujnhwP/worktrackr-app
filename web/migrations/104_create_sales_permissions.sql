-- Per-user Sales permissions.
-- One row per staff member holding which Sales elements they may access, as a
-- small JSON map (keys: companies, quotes, orders, calendar, figures,
-- commission_rules). No row = fall back to sensible defaults derived from the
-- person's role (handled in the API), so existing users aren't locked out on
-- rollout. Admins/managers/owner are always unrestricted regardless of any row.
-- Idempotent so a re-run on boot never crashes.

CREATE TABLE IF NOT EXISTS user_sales_permissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL,
  user_id          UUID NOT NULL,
  perms            JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organisation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sales_perms_org_user ON user_sales_permissions(organisation_id, user_id);
