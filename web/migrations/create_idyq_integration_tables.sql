-- IdoYourQuotes (IDYQ) integration tables
-- Read-only mirror of IDYQ's catalogue + quotes, pulled server-to-server.
-- Kept separate from WorkTrackr's native products/quotes so re-pulling is
-- idempotent and never collides with user-created records.
-- Picked up automatically by web/run-migrations.js on next deploy.

-- Per-organisation on/off switch + status (the "Connect IdoYourQuotes" toggle).
CREATE TABLE IF NOT EXISTS idyq_connection (
    organisation_id        UUID PRIMARY KEY REFERENCES organisations(id) ON DELETE CASCADE,
    enabled                BOOLEAN NOT NULL DEFAULT FALSE,
    idyq_org_ref           TEXT,                 -- which IDYQ org to read (slug or id)
    connected_at           TIMESTAMPTZ,
    connected_by           UUID REFERENCES users(id),
    last_catalogue_sync_at TIMESTAMPTZ,
    last_quotes_sync_at    TIMESTAMPTZ,
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Mirror of the IDYQ product catalogue. Field names mirror IDYQ's own.
CREATE TABLE IF NOT EXISTS idyq_products (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    idyq_id           TEXT NOT NULL,            -- IDYQ's product id (the upsert key)
    sku               TEXT,
    name              TEXT,
    description       TEXT,
    unit_price        NUMERIC,
    currency          TEXT,
    category          TEXT,
    active            BOOLEAN,
    source_updated_at TIMESTAMPTZ,              -- IDYQ's updated_at
    raw               JSONB,                    -- full original payload (safety net)
    synced_at         TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organisation_id, idyq_id)
);
CREATE INDEX IF NOT EXISTS idx_idyq_products_org ON idyq_products(organisation_id);
CREATE INDEX IF NOT EXISTS idx_idyq_products_sku ON idyq_products(organisation_id, sku);

-- Mirror of IDYQ quotes (header). Customer is flattened from IDYQ's nested object.
CREATE TABLE IF NOT EXISTS idyq_quotes (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id    UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    idyq_id            TEXT NOT NULL,           -- IDYQ's quote id (the upsert key)
    quote_number       TEXT,
    status             TEXT,
    currency           TEXT,
    total              NUMERIC,
    customer_name      TEXT,
    customer_email     TEXT,
    customer_company   TEXT,
    source_created_at  TIMESTAMPTZ,
    source_updated_at  TIMESTAMPTZ,
    raw                JSONB,
    synced_at          TIMESTAMPTZ DEFAULT NOW(),
    -- Link layer: lives ONLY in WorkTrackr, never sent back to IDYQ.
    -- Ties a read-only IDYQ quote to a WorkTrackr contact. Note: a "company"/
    -- customer is a row in `contacts` (type = 'company') since the
    -- customers -> contacts merge removed the old customers table.
    linked_contact_id  UUID REFERENCES contacts(id) ON DELETE SET NULL,
    UNIQUE (organisation_id, idyq_id)
);
CREATE INDEX IF NOT EXISTS idx_idyq_quotes_org    ON idyq_quotes(organisation_id);
CREATE INDEX IF NOT EXISTS idx_idyq_quotes_number ON idyq_quotes(organisation_id, quote_number);
CREATE INDEX IF NOT EXISTS idx_idyq_quotes_status ON idyq_quotes(organisation_id, status);

-- Quote line items. IDYQ line items have no stable id in the documented shape,
-- so on each pull we replace the whole set for a quote (inside a transaction).
CREATE TABLE IF NOT EXISTS idyq_quote_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idyq_quote_id   UUID NOT NULL REFERENCES idyq_quotes(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    idyq_product_id TEXT,                       -- product_id from the IDYQ line (nullable)
    sku             TEXT,
    description     TEXT,
    qty             NUMERIC,
    unit_price      NUMERIC,
    line_total      NUMERIC,
    sort_order      INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_idyq_quote_lines_quote ON idyq_quote_lines(idyq_quote_id);

-- Incremental cursor per resource, so we can pull only what changed (?since=).
CREATE TABLE IF NOT EXISTS idyq_sync_state (
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    resource        TEXT NOT NULL,              -- 'catalogue' | 'quotes'
    last_cursor     TIMESTAMPTZ,                -- max source_updated_at seen so far
    last_run_at     TIMESTAMPTZ,
    last_status     TEXT,                       -- 'ok' | 'error'
    last_error      TEXT,
    PRIMARY KEY (organisation_id, resource)
);
