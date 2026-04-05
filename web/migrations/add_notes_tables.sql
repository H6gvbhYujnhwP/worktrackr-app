-- Migration: add_notes_tables.sql
-- Adds personal_notes, shared_notes, and shared_note_versions tables

-- Personal notes (private per user)
CREATE TABLE IF NOT EXISTS personal_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  body            TEXT NOT NULL DEFAULT '',
  title           VARCHAR(500) NOT NULL DEFAULT '',
  pinned          BOOLEAN NOT NULL DEFAULT FALSE,
  due_date        TIMESTAMPTZ,
  completed       BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_notes_user ON personal_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_notes_org  ON personal_notes(organisation_id);

-- Shared notes (all staff in an org can read and write)
CREATE TABLE IF NOT EXISTS shared_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_edited_by  UUID REFERENCES users(id),
  title           VARCHAR(500) NOT NULL DEFAULT '',
  body            TEXT NOT NULL DEFAULT '',
  category        VARCHAR(255),
  note_type       VARCHAR(50) NOT NULL DEFAULT 'note'
                  CHECK (note_type IN ('note', 'knowledge', 'announcement')),
  pinned          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_notes_org      ON shared_notes(organisation_id);
CREATE INDEX IF NOT EXISTS idx_shared_notes_category ON shared_notes(organisation_id, category);
CREATE INDEX IF NOT EXISTS idx_shared_notes_type     ON shared_notes(organisation_id, note_type);

-- Version history for shared notes
CREATE TABLE IF NOT EXISTS shared_note_versions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id      UUID NOT NULL REFERENCES shared_notes(id) ON DELETE CASCADE,
  edited_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        VARCHAR(500) NOT NULL DEFAULT '',
  body         TEXT NOT NULL DEFAULT '',
  edited_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_note_versions_note ON shared_note_versions(note_id);
