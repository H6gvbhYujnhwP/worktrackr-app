-- Migration for products table
-- Note: This table already exists in production, this migration ensures it exists with correct schema

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    
    -- Product Information
    name TEXT NOT NULL,
    description TEXT,
    type TEXT, -- Production uses 'type' not 'category'
    sku TEXT,
    
    -- Pricing
    our_cost NUMERIC DEFAULT 0 CHECK (our_cost >= 0),
    client_price NUMERIC DEFAULT 0 CHECK (client_price >= 0),
    unit TEXT DEFAULT 'service',
    tax_rate NUMERIC DEFAULT 20 CHECK (tax_rate >= 0 AND tax_rate <= 100),
    default_quantity NUMERIC DEFAULT 1 CHECK (default_quantity >= 0),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_organisation ON products(organisation_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(organisation_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(organisation_id, type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(organisation_id, sku) WHERE sku IS NOT NULL;
