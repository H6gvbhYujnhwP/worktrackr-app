-- Phase 11 — shared "saved searches" for the Sales → Companies filter.
--
-- A saved search is a NAMED, TEAM-SHARED filter combination. Anyone in the
-- organisation who can reach Sales may create one; only its creator or a
-- manager/admin may delete it (enforced in routes/saved-searches.js).
--
-- filters : the exact tick-box selection, stored as-is. Deliberately schemaless
--           so adding a new filter group later needs NO migration — the route
--           and the screen both rebuild it defensively on read.
-- summary : a human-readable description ("Voicemail + Contacted · Kent")
--           captured AT SAVE TIME. Generated later it could read "Unknown user"
--           if a Spotter's record changed, so it is frozen on the way in.
-- scope   : which screen the search belongs to ('companies' today). Lets the
--           same table serve other lists later without another migration.
--
-- Idempotent. No money figures. Filename 'phase11_' sorts after 'phase10_',
-- so it runs last on boot.

CREATE TABLE IF NOT EXISTS saved_searches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  scope           TEXT NOT NULL DEFAULT 'companies',
  name            TEXT NOT NULL,
  filters         JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary         TEXT NOT NULL DEFAULT '',
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- One name per scope per organisation, case-insensitively, so the shared list
-- can't fill up with three different things called "Kent". Saving an existing
-- name overwrites that row instead (see the POST handler).
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_searches_unique_name
  ON saved_searches (organisation_id, scope, lower(name));

CREATE INDEX IF NOT EXISTS idx_saved_searches_org_scope
  ON saved_searches (organisation_id, scope, name);
