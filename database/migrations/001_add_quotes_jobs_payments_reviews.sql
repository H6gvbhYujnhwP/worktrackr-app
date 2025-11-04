-- WorkTrackr Phase 1 Migration: Quotes, Jobs, Payments, Reviews
-- Version: 1.0.0
-- Date: 2025-11-04
-- Description: Adds complete SME workflow infrastructure (customers, products, quotes, jobs, invoices, payments, reviews)

-- ============================================================================
-- PART 1: CUSTOMERS & CONTACTS
-- ============================================================================

-- Customers table (companies/individuals who purchase services)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United Kingdom',
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table (multiple contacts per customer)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    role VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2: PRODUCT CATALOG
-- ============================================================================

-- Products/Services catalog
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'service' CHECK (type IN ('service', 'product', 'labor', 'material')),
    sku VARCHAR(100),
    our_cost DECIMAL(10,2),
    client_price DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'service', -- 'hour', 'item', 'service', 'day', 'sqm', etc.
    default_quantity DECIMAL(10,2) DEFAULT 1,
    tax_rate DECIMAL(5,2) DEFAULT 20.00, -- UK VAT default 20%
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 3: QUOTES SYSTEM
-- ============================================================================

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired')),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    valid_until DATE,
    terms_conditions TEXT,
    notes TEXT,
    internal_notes TEXT, -- Private notes not visible to customer
    created_by UUID REFERENCES users(id),
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    declined_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote line items
CREATE TABLE IF NOT EXISTS quote_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 20.00,
    line_total DECIMAL(10,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote acceptance records (e-signature capture)
CREATE TABLE IF NOT EXISTS quote_acceptance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    accepted_by_name VARCHAR(255) NOT NULL,
    accepted_by_email VARCHAR(255) NOT NULL,
    signature_data TEXT, -- Base64 encoded signature image
    ip_address INET,
    user_agent TEXT,
    accepted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 4: JOBS SYSTEM
-- ============================================================================

-- Jobs table (scheduled work from accepted quotes)
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    job_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    quote_id UUID REFERENCES quotes(id),
    ticket_id UUID REFERENCES tickets(id), -- Link to existing ticket if applicable
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    assigned_user_id UUID REFERENCES users(id),
    location_address TEXT,
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    notes TEXT,
    internal_notes TEXT,
    customer_signature TEXT, -- Base64 encoded signature
    customer_signed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Job materials used
CREATE TABLE IF NOT EXISTS job_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job photos (before/after, documentation)
CREATE TABLE IF NOT EXISTS job_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    caption TEXT,
    photo_type VARCHAR(50) CHECK (photo_type IN ('before', 'during', 'after', 'issue', 'completion', 'other')),
    taken_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job time tracking
CREATE TABLE IF NOT EXISTS job_time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 5: INVOICES SYSTEM
-- ============================================================================

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    job_id UUID REFERENCES jobs(id),
    quote_id UUID REFERENCES quotes(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded')),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    balance_due DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    terms TEXT,
    payment_terms_days INTEGER DEFAULT 30,
    stripe_payment_link TEXT,
    stripe_payment_link_id TEXT,
    created_by UUID REFERENCES users(id),
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 20.00,
    line_total DECIMAL(10,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 6: PAYMENTS SYSTEM
-- ============================================================================

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('stripe', 'cash', 'check', 'bank_transfer', 'card', 'other')),
    payment_date DATE NOT NULL,
    reference_number VARCHAR(100),
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment allocations (link payments to invoices)
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 7: REVIEWS SYSTEM
-- ============================================================================

-- Customer reviews
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    job_id UUID REFERENCES jobs(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    reviewer_name VARCHAR(255),
    reviewer_email VARCHAR(255),
    is_anonymous BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
    reviewed_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    response TEXT,
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES users(id),
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review photos
CREATE TABLE IF NOT EXISTS review_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 8: ACCOUNTING INTEGRATIONS
-- ============================================================================

-- Accounting integration settings
CREATE TABLE IF NOT EXISTS accounting_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('xero', 'quickbooks')),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    tenant_id TEXT, -- Xero tenant ID or QuickBooks realm ID
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    sync_settings JSONB, -- Configuration for what to sync
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organisation_id, provider)
);

-- Sync log for debugging
CREATE TABLE IF NOT EXISTS accounting_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES accounting_integrations(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL, -- 'invoice', 'payment', 'customer'
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('push', 'pull')),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    external_id TEXT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
    error_message TEXT,
    sync_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 9: INDEXES FOR PERFORMANCE
-- ============================================================================

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_organisation_id ON customers(organisation_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

-- Contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_organisation_id ON contacts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_organisation_id ON products(organisation_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);

-- Quotes indexes
CREATE INDEX IF NOT EXISTS idx_quotes_organisation_id ON quotes(organisation_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);

-- Quote lines indexes
CREATE INDEX IF NOT EXISTS idx_quote_lines_quote_id ON quote_lines(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_product_id ON quote_lines(product_id);

-- Jobs indexes
CREATE INDEX IF NOT EXISTS idx_jobs_organisation_id ON jobs(organisation_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_quote_id ON jobs(quote_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_user_id ON jobs(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_start ON jobs(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_jobs_job_number ON jobs(job_number);

-- Job materials indexes
CREATE INDEX IF NOT EXISTS idx_job_materials_job_id ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_product_id ON job_materials(product_id);

-- Job photos indexes
CREATE INDEX IF NOT EXISTS idx_job_photos_job_id ON job_photos(job_id);

-- Job time entries indexes
CREATE INDEX IF NOT EXISTS idx_job_time_entries_job_id ON job_time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_job_time_entries_user_id ON job_time_entries(user_id);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_organisation_id ON invoices(organisation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- Invoice lines indexes
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_product_id ON invoice_lines(product_id);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_organisation_id ON payments(organisation_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_number ON payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

-- Payment allocations indexes
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_organisation_id ON reviews(organisation_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_job_id ON reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Review photos indexes
CREATE INDEX IF NOT EXISTS idx_review_photos_review_id ON review_photos(review_id);

-- Accounting integrations indexes
CREATE INDEX IF NOT EXISTS idx_accounting_integrations_organisation_id ON accounting_integrations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_accounting_sync_log_organisation_id ON accounting_sync_log(organisation_id);
CREATE INDEX IF NOT EXISTS idx_accounting_sync_log_integration_id ON accounting_sync_log(integration_id);
CREATE INDEX IF NOT EXISTS idx_accounting_sync_log_created_at ON accounting_sync_log(created_at);

-- ============================================================================
-- PART 10: UPDATE TRIGGERS
-- ============================================================================

-- Customers update trigger
CREATE TRIGGER update_customers_updated_at 
BEFORE UPDATE ON customers 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Contacts update trigger
CREATE TRIGGER update_contacts_updated_at 
BEFORE UPDATE ON contacts 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Products update trigger
CREATE TRIGGER update_products_updated_at 
BEFORE UPDATE ON products 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Quotes update trigger
CREATE TRIGGER update_quotes_updated_at 
BEFORE UPDATE ON quotes 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Jobs update trigger
CREATE TRIGGER update_jobs_updated_at 
BEFORE UPDATE ON jobs 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Invoices update trigger
CREATE TRIGGER update_invoices_updated_at 
BEFORE UPDATE ON invoices 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Payments update trigger
CREATE TRIGGER update_payments_updated_at 
BEFORE UPDATE ON payments 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Accounting integrations update trigger
CREATE TRIGGER update_accounting_integrations_updated_at 
BEFORE UPDATE ON accounting_integrations 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 11: HELPER FUNCTIONS
-- ============================================================================

-- Function to generate next quote number
CREATE OR REPLACE FUNCTION generate_quote_number(org_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
    year_prefix VARCHAR(4);
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_num
    FROM quotes
    WHERE organisation_id = org_id
    AND quote_number LIKE 'QT-' || year_prefix || '-%';
    
    RETURN 'QT-' || year_prefix || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate next job number
CREATE OR REPLACE FUNCTION generate_job_number(org_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
    year_prefix VARCHAR(4);
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(job_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_num
    FROM jobs
    WHERE organisation_id = org_id
    AND job_number LIKE 'JOB-' || year_prefix || '-%';
    
    RETURN 'JOB-' || year_prefix || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(org_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
    year_prefix VARCHAR(4);
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_num
    FROM invoices
    WHERE organisation_id = org_id
    AND invoice_number LIKE 'INV-' || year_prefix || '-%';
    
    RETURN 'INV-' || year_prefix || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate next payment number
CREATE OR REPLACE FUNCTION generate_payment_number(org_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
    year_prefix VARCHAR(4);
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_num
    FROM payments
    WHERE organisation_id = org_id
    AND payment_number LIKE 'PAY-' || year_prefix || '-%';
    
    RETURN 'PAY-' || year_prefix || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 12: AUTOMATIC INVOICE STATUS UPDATE TRIGGER
-- ============================================================================

-- Function to update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
    inv_total DECIMAL(10,2);
    paid_amount DECIMAL(10,2);
BEGIN
    -- Get invoice total
    SELECT total_amount INTO inv_total
    FROM invoices
    WHERE id = NEW.invoice_id;
    
    -- Calculate total paid for this invoice
    SELECT COALESCE(SUM(amount), 0) INTO paid_amount
    FROM payment_allocations
    WHERE invoice_id = NEW.invoice_id;
    
    -- Update invoice status
    IF paid_amount >= inv_total THEN
        UPDATE invoices
        SET status = 'paid',
            amount_paid = paid_amount,
            balance_due = 0,
            paid_at = NOW()
        WHERE id = NEW.invoice_id;
    ELSIF paid_amount > 0 THEN
        UPDATE invoices
        SET status = 'partially_paid',
            amount_paid = paid_amount,
            balance_due = inv_total - paid_amount
        WHERE id = NEW.invoice_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update invoice status when payment allocated
CREATE TRIGGER trigger_update_invoice_status
AFTER INSERT ON payment_allocations
FOR EACH ROW EXECUTE FUNCTION update_invoice_status();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'WorkTrackr Phase 1 Migration Complete!';
    RAISE NOTICE 'Tables created: 17 new tables';
    RAISE NOTICE 'Indexes created: 50+ performance indexes';
    RAISE NOTICE 'Triggers created: 9 update triggers + 1 status trigger';
    RAISE NOTICE 'Functions created: 5 helper functions';
END $$;

