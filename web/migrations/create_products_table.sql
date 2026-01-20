-- Migration for products table

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    
    -- Product Information
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    sku TEXT,
    
    -- Pricing
    our_cost NUMERIC DEFAULT 0 CHECK (our_cost >= 0),
    client_price NUMERIC DEFAULT 0 CHECK (client_price >= 0),
    unit TEXT DEFAULT 'service',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_organisation ON products(organisation_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(organisation_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(organisation_id, category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(organisation_id, sku) WHERE sku IS NOT NULL;
