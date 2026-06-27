-- Durable file attachments for company/contact records.
-- Files are stored in the database (BYTEA) so they survive Render deploys,
-- since no external object storage is configured. Size is capped in the API.
CREATE TABLE IF NOT EXISTS contact_attachments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id       UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  organisation_id  UUID NOT NULL,
  uploader_id      UUID,
  filename         VARCHAR(255) NOT NULL,
  mime_type        VARCHAR(150),
  size_bytes       INTEGER,
  note             TEXT,
  data             BYTEA NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_attachments_contact ON contact_attachments(contact_id);
