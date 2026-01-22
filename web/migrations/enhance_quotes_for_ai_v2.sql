-- Migration: Enhance Quotes System for AI Features (v2 - Safe)
-- Date: 2026-01-22
-- Description: Safely adds AI-powered features to existing quotes system

-- ============================================================================
-- PART 1: Enhance quotes table (add columns if not exist)
-- ============================================================================

-- Add version tracking
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='version') THEN
        ALTER TABLE quotes ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='parent_quote_id') THEN
        ALTER TABLE quotes ADD COLUMN parent_quote_id UUID REFERENCES quotes(id);
    END IF;
END $$;

-- Add AI metadata
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='ai_generated') THEN
        ALTER TABLE quotes ADD COLUMN ai_generated BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='ai_context') THEN
        ALTER TABLE quotes ADD COLUMN ai_context JSONB;
    END IF;
END $$;

-- Add ticket linkage
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='ticket_id') THEN
        ALTER TABLE quotes ADD COLUMN ticket_id UUID REFERENCES tickets(id);
    END IF;
END $$;

-- Add approval tracking
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='approved_by') THEN
        ALTER TABLE quotes ADD COLUMN approved_by UUID REFERENCES users(id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='approver_email') THEN
        ALTER TABLE quotes ADD COLUMN approver_email VARCHAR(255);
    END IF;
END $$;

-- Add share token for public links
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='share_token') THEN
        ALTER TABLE quotes ADD COLUMN share_token VARCHAR(100) UNIQUE;
    END IF;
END $$;

-- Update status constraint to include 'superseded'
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check 
    CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'superseded'));

-- ============================================================================
-- PART 2: Enhance quote_lines table
-- ============================================================================

-- Add line item type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quote_lines' AND column_name='type') THEN
        ALTER TABLE quote_lines ADD COLUMN type VARCHAR(50) DEFAULT 'labour' 
            CHECK (type IN ('labour', 'parts', 'fixed_fee'));
    END IF;
END $$;

-- Add buy cost for margin tracking
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quote_lines' AND column_name='buy_cost') THEN
        ALTER TABLE quote_lines ADD COLUMN buy_cost DECIMAL(10,2);
    END IF;
END $$;

-- Add unit field
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quote_lines' AND column_name='unit') THEN
        ALTER TABLE quote_lines ADD COLUMN unit VARCHAR(50) DEFAULT 'hours';
    END IF;
END $$;

-- ============================================================================
-- PART 3: Create quote_templates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS quote_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(100), -- e.g., 'IT Support', 'Plumbing', 'Electrical'
    description TEXT,
    default_line_items JSONB NOT NULL DEFAULT '[]', -- Array of default line items
    exclusions TEXT[], -- Array of standard exclusions
    terms_and_conditions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_templates_org ON quote_templates(organisation_id);
CREATE INDEX IF NOT EXISTS idx_quote_templates_sector ON quote_templates(sector);

-- ============================================================================
-- PART 4: Create transcripts table (for audio transcription)
-- ============================================================================

CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    ticket_id UUID REFERENCES tickets(id),
    quote_id UUID REFERENCES quotes(id),
    filename VARCHAR(255),
    duration INTEGER, -- seconds
    text TEXT NOT NULL,
    segments JSONB, -- Timestamped segments from Whisper
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcripts_org ON transcripts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_ticket ON transcripts(ticket_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_quote ON transcripts(quote_id);

-- ============================================================================
-- PART 5: Create ai_extractions table (audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    transcript_id UUID REFERENCES transcripts(id),
    quote_id UUID REFERENCES quotes(id),
    ticket_id UUID REFERENCES tickets(id),
    model VARCHAR(100) NOT NULL, -- e.g., 'gpt-4-turbo', 'whisper-1'
    extraction_type VARCHAR(50) NOT NULL, -- 'quote', 'ticket', 'summary'
    extracted_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    user_modified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_extractions_org ON ai_extractions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_ai_extractions_type ON ai_extractions(extraction_type);

-- ============================================================================
-- PART 6: Helper Functions
-- ============================================================================

-- Function to generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number(org_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
    quote_num VARCHAR;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_num
    FROM quotes
    WHERE organisation_id = org_id
    AND quote_number ~ '^Q-[0-9]+$';
    
    quote_num := 'Q-' || LPAD(next_num::TEXT, 6, '0');
    RETURN quote_num;
END;
$$ LANGUAGE plpgsql;

-- Function to generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 7: Insert Default Templates
-- ============================================================================

INSERT INTO quote_templates (organisation_id, name, sector, description, default_line_items, exclusions, terms_and_conditions)
SELECT 
    o.id,
    'Remote IT Support - Standard',
    'IT Support',
    'Standard remote IT support service template',
    '[
        {"type": "labour", "description": "Remote diagnostic and troubleshooting", "quantity": 1, "unit": "hours", "sell_price": 75.00},
        {"type": "labour", "description": "Software installation and configuration", "quantity": 0.5, "unit": "hours", "sell_price": 75.00}
    ]'::jsonb,
    ARRAY['On-site visits', 'Hardware replacement', 'Data recovery'],
    'Payment due within 30 days. Remote access credentials required.'
FROM organisations o
WHERE NOT EXISTS (
    SELECT 1 FROM quote_templates qt 
    WHERE qt.organisation_id = o.id 
    AND qt.name = 'Remote IT Support - Standard'
);

INSERT INTO quote_templates (organisation_id, name, sector, description, default_line_items, exclusions, terms_and_conditions)
SELECT 
    o.id,
    'On-Site IT Support',
    'IT Support',
    'On-site IT support service template',
    '[
        {"type": "labour", "description": "On-site visit and assessment", "quantity": 2, "unit": "hours", "sell_price": 95.00},
        {"type": "fixed_fee", "description": "Call-out fee", "quantity": 1, "unit": "service", "sell_price": 50.00}
    ]'::jsonb,
    ARRAY['Parts and materials', 'Parking fees', 'Out-of-hours work'],
    'Payment due within 30 days. Travel time charged at standard rate.'
FROM organisations o
WHERE NOT EXISTS (
    SELECT 1 FROM quote_templates qt 
    WHERE qt.organisation_id = o.id 
    AND qt.name = 'On-Site IT Support'
);

INSERT INTO quote_templates (organisation_id, name, sector, description, default_line_items, exclusions, terms_and_conditions)
SELECT 
    o.id,
    'Network Installation - Small Office',
    'IT Support',
    'Small office network installation template',
    '[
        {"type": "labour", "description": "Network design and planning", "quantity": 4, "unit": "hours", "sell_price": 85.00},
        {"type": "labour", "description": "Installation and configuration", "quantity": 8, "unit": "hours", "sell_price": 85.00},
        {"type": "parts", "description": "Network equipment (router, switches, cables)", "quantity": 1, "unit": "set", "sell_price": 500.00}
    ]'::jsonb,
    ARRAY['Structural cabling', 'Electrical work', 'Ongoing support'],
    'Payment: 50% deposit, 50% on completion. 12-month warranty on equipment.'
FROM organisations o
WHERE NOT EXISTS (
    SELECT 1 FROM quote_templates qt 
    WHERE qt.organisation_id = o.id 
    AND qt.name = 'Network Installation - Small Office'
);

-- ============================================================================
-- PART 8: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quotes_version ON quotes(parent_quote_id, version);
CREATE INDEX IF NOT EXISTS idx_quotes_ticket ON quotes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_quotes_ai_generated ON quotes(ai_generated);
CREATE INDEX IF NOT EXISTS idx_quote_lines_type ON quote_lines(type);

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'Added AI features to quotes system:';
    RAISE NOTICE '  - Version tracking and revisions';
    RAISE NOTICE '  - AI generation metadata';
    RAISE NOTICE '  - Quote templates (3 defaults added)';
    RAISE NOTICE '  - Transcription support';
    RAISE NOTICE '  - AI extraction audit trail';
END $$;
