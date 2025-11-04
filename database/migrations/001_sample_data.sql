-- WorkTrackr Phase 1 Sample Data
-- Version: 1.0.0
-- Date: 2025-11-04
-- Description: Sample data for testing Phase 1 features

-- ============================================================================
-- IMPORTANT: Replace the UUIDs below with actual IDs from your database
-- ============================================================================

-- Get your organization ID:
-- SELECT id FROM organisations WHERE name = 'Test Organization';

-- Get your user ID:
-- SELECT id FROM users WHERE email = 'test@worktrackr.com';

-- ============================================================================
-- SAMPLE CUSTOMERS
-- ============================================================================

-- Insert sample customers (replace organisation_id and created_by)
INSERT INTO customers (organisation_id, company_name, contact_name, email, phone, address, city, postal_code, created_by)
VALUES 
    ('c2c34e37-cc8e-4381-b346-6fb1403785bd', 'Acme Corporation', 'John Smith', 'john@acme.com', '020 7946 0958', '123 High Street', 'London', 'SW1A 1AA', '9579a033-b337-47c1-9f46-f4d4169248a3'),
    ('c2c34e37-cc8e-4381-b346-6fb1403785bd', 'Tech Solutions Ltd', 'Sarah Johnson', 'sarah@techsolutions.co.uk', '0161 496 0000', '45 Market Street', 'Manchester', 'M1 1WR', '9579a033-b337-47c1-9f46-f4d4169248a3'),
    ('c2c34e37-cc8e-4381-b346-6fb1403785bd', 'Green Energy Co', 'Michael Brown', 'michael@greenenergy.co.uk', '0131 496 0000', '78 Princes Street', 'Edinburgh', 'EH2 2ER', '9579a033-b337-47c1-9f46-f4d4169248a3');

-- Insert sample contacts
INSERT INTO contacts (organisation_id, customer_id, name, email, phone, mobile, role, is_primary)
SELECT 
    'c2c34e37-cc8e-4381-b346-6fb1403785bd',
    c.id,
    c.contact_name,
    c.email,
    c.phone,
    CASE 
        WHEN c.company_name = 'Acme Corporation' THEN '07700 900000'
        WHEN c.company_name = 'Tech Solutions Ltd' THEN '07700 900001'
        ELSE '07700 900002'
    END,
    'Primary Contact',
    TRUE
FROM customers c
WHERE c.organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd';

-- ============================================================================
-- SAMPLE PRODUCTS
-- ============================================================================

-- Insert sample products/services
INSERT INTO products (organisation_id, name, description, type, our_cost, client_price, unit, default_quantity, tax_rate, created_by)
VALUES 
    ('c2c34e37-cc8e-4381-b346-6fb1403785bd', 'HVAC Maintenance', 'Annual HVAC system maintenance and inspection', 'service', 150.00, 300.00, 'service', 1, 20.00, '9579a033-b337-47c1-9f46-f4d4169248a3'),
    ('c2c34e37-cc8e-4381-b346-6fb1403785bd', 'Electrical Inspection', 'Comprehensive electrical safety inspection', 'service', 80.00, 180.00, 'inspection', 1, 20.00, '9579a033-b337-47c1-9f46-f4d4169248a3'),
    ('c2c34e37-cc8e-4381-b346-6fb1403785bd', 'Plumbing Repair', 'Standard plumbing repair service', 'service', 120.00, 250.00, 'job', 1, 20.00, '9579a033-b337-47c1-9f46-f4d4169248a3'),
    ('c2c34e37-cc8e-4381-b346-6fb1403785bd', 'Emergency Call-Out', '24/7 emergency service call-out', 'service', 100.00, 200.00, 'call', 1, 20.00, '9579a033-b337-47c1-9f46-f4d4169248a3'),
    ('c2c34e37-cc8e-4381-b346-6fb1403785bd', 'Labor Hour', 'Standard labor hour', 'labor', 30.00, 75.00, 'hour', 1, 20.00, '9579a033-b337-47c1-9f46-f4d4169248a3'),
    ('c2c34e37-cc8e-4381-b346-6fb1403785bd', 'Copper Pipe 22mm', '22mm copper pipe per meter', 'material', 5.00, 12.00, 'meter', 1, 20.00, '9579a033-b337-47c1-9f46-f4d4169248a3'),
    ('c2c34e37-cc8e-4381-b346-6fb1403785bd', 'HVAC Filter', 'Standard HVAC filter replacement', 'product', 15.00, 35.00, 'item', 1, 20.00, '9579a033-b337-47c1-9f46-f4d4169248a3');

-- ============================================================================
-- SAMPLE QUOTE
-- ============================================================================

-- Insert sample quote
WITH new_quote AS (
    INSERT INTO quotes (
        organisation_id, 
        customer_id, 
        quote_number, 
        title, 
        description, 
        status, 
        subtotal, 
        tax_amount, 
        total_amount, 
        valid_until, 
        terms_conditions,
        created_by
    )
    SELECT 
        'c2c34e37-cc8e-4381-b346-6fb1403785bd',
        c.id,
        generate_quote_number('c2c34e37-cc8e-4381-b346-6fb1403785bd'),
        'HVAC Maintenance Service',
        'Annual maintenance service for your HVAC system including inspection, cleaning, and minor repairs.',
        'draft',
        375.00,
        75.00,
        450.00,
        CURRENT_DATE + INTERVAL '30 days',
        'Payment due within 30 days of acceptance. Work to be completed within 14 days of quote acceptance.',
        '9579a033-b337-47c1-9f46-f4d4169248a3'
    FROM customers c
    WHERE c.company_name = 'Acme Corporation'
    AND c.organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd'
    LIMIT 1
    RETURNING id
)
-- Insert quote lines
INSERT INTO quote_lines (quote_id, product_id, description, quantity, unit_price, tax_rate, line_total, sort_order)
SELECT 
    nq.id,
    p.id,
    p.name,
    CASE 
        WHEN p.name = 'HVAC Maintenance' THEN 1
        WHEN p.name = 'HVAC Filter' THEN 2
        ELSE 1
    END,
    p.client_price,
    p.tax_rate,
    CASE 
        WHEN p.name = 'HVAC Maintenance' THEN 300.00
        WHEN p.name = 'HVAC Filter' THEN 70.00
        ELSE p.client_price
    END,
    CASE 
        WHEN p.name = 'HVAC Maintenance' THEN 1
        WHEN p.name = 'HVAC Filter' THEN 2
        ELSE 3
    END
FROM new_quote nq, products p
WHERE p.name IN ('HVAC Maintenance', 'HVAC Filter')
AND p.organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd';

-- ============================================================================
-- SAMPLE JOB
-- ============================================================================

-- Insert sample job (from accepted quote)
WITH accepted_quote AS (
    SELECT id, customer_id
    FROM quotes
    WHERE organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd'
    LIMIT 1
)
INSERT INTO jobs (
    organisation_id,
    job_number,
    customer_id,
    quote_id,
    title,
    description,
    status,
    priority,
    scheduled_start,
    scheduled_end,
    assigned_user_id,
    location_address,
    estimated_hours,
    created_by
)
SELECT 
    'c2c34e37-cc8e-4381-b346-6fb1403785bd',
    generate_job_number('c2c34e37-cc8e-4381-b346-6fb1403785bd'),
    aq.customer_id,
    aq.id,
    'HVAC Maintenance - Acme Corporation',
    'Annual HVAC maintenance service',
    'scheduled',
    'medium',
    CURRENT_TIMESTAMP + INTERVAL '3 days',
    CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '4 hours',
    '9579a033-b337-47c1-9f46-f4d4169248a3',
    '123 High Street, London, SW1A 1AA',
    4.0,
    '9579a033-b337-47c1-9f46-f4d4169248a3'
FROM accepted_quote aq;

-- ============================================================================
-- SAMPLE INVOICE
-- ============================================================================

-- Insert sample invoice (from completed job)
WITH completed_job AS (
    SELECT id, customer_id, quote_id
    FROM jobs
    WHERE organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd'
    LIMIT 1
)
INSERT INTO invoices (
    organisation_id,
    customer_id,
    job_id,
    quote_id,
    invoice_number,
    status,
    issue_date,
    due_date,
    subtotal,
    tax_amount,
    total_amount,
    balance_due,
    payment_terms_days,
    terms,
    created_by
)
SELECT 
    'c2c34e37-cc8e-4381-b346-6fb1403785bd',
    cj.customer_id,
    cj.id,
    cj.quote_id,
    generate_invoice_number('c2c34e37-cc8e-4381-b346-6fb1403785bd'),
    'draft',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    375.00,
    75.00,
    450.00,
    450.00,
    30,
    'Payment due within 30 days. Late payments may incur additional charges.',
    '9579a033-b337-47c1-9f46-f4d4169248a3'
FROM completed_job cj;

-- Insert invoice lines (from job)
WITH latest_invoice AS (
    SELECT id
    FROM invoices
    WHERE organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd'
    ORDER BY created_at DESC
    LIMIT 1
)
INSERT INTO invoice_lines (invoice_id, product_id, description, quantity, unit_price, tax_rate, line_total, sort_order)
SELECT 
    li.id,
    p.id,
    p.name,
    CASE 
        WHEN p.name = 'HVAC Maintenance' THEN 1
        WHEN p.name = 'HVAC Filter' THEN 2
        ELSE 1
    END,
    p.client_price,
    p.tax_rate,
    CASE 
        WHEN p.name = 'HVAC Maintenance' THEN 300.00
        WHEN p.name = 'HVAC Filter' THEN 70.00
        ELSE p.client_price
    END,
    CASE 
        WHEN p.name = 'HVAC Maintenance' THEN 1
        WHEN p.name = 'HVAC Filter' THEN 2
        ELSE 3
    END
FROM latest_invoice li, products p
WHERE p.name IN ('HVAC Maintenance', 'HVAC Filter')
AND p.organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify sample data
DO $$
DECLARE
    customer_count INTEGER;
    product_count INTEGER;
    quote_count INTEGER;
    job_count INTEGER;
    invoice_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO customer_count FROM customers WHERE organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd';
    SELECT COUNT(*) INTO product_count FROM products WHERE organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd';
    SELECT COUNT(*) INTO quote_count FROM quotes WHERE organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd';
    SELECT COUNT(*) INTO job_count FROM jobs WHERE organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd';
    SELECT COUNT(*) INTO invoice_count FROM invoices WHERE organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd';
    
    RAISE NOTICE 'Sample Data Inserted!';
    RAISE NOTICE 'Customers: %', customer_count;
    RAISE NOTICE 'Products: %', product_count;
    RAISE NOTICE 'Quotes: %', quote_count;
    RAISE NOTICE 'Jobs: %', job_count;
    RAISE NOTICE 'Invoices: %', invoice_count;
END $$;

-- Display sample data
SELECT 'CUSTOMERS' as table_name, company_name as name, email FROM customers WHERE organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd'
UNION ALL
SELECT 'PRODUCTS', name, CAST(client_price AS VARCHAR) FROM products WHERE organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd'
UNION ALL
SELECT 'QUOTES', quote_number, title FROM quotes WHERE organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd'
UNION ALL
SELECT 'JOBS', job_number, title FROM jobs WHERE organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd'
UNION ALL
SELECT 'INVOICES', invoice_number, CAST(total_amount AS VARCHAR) FROM invoices WHERE organisation_id = 'c2c34e37-cc8e-4381-b346-6fb1403785bd';

