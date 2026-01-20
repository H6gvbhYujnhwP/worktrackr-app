-- Migration for customer_services table

CREATE TABLE IF NOT EXISTS customer_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    
    -- Service Details
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    custom_price NUMERIC,
    
    -- Renewal Management
    renewal_date DATE,
    renewal_frequency TEXT CHECK (renewal_frequency IN (
        'monthly', 
        'quarterly', 
        'annually', 
        'none'
    )),
    auto_renew BOOLEAN DEFAULT FALSE,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(contact_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_services_organisation ON customer_services(organisation_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_contact ON customer_services(contact_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_product ON customer_services(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_renewal ON customer_services(organisation_id, renewal_date) WHERE renewal_date IS NOT NULL;
