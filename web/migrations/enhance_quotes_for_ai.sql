-- Enhancement Migration: AI-Powered Quotes System
-- Date: 2026-01-21
-- Description: Adds versioning, AI context, margins, and templates to existing quotes system

-- ============================================================================
-- PART 1: Enhance existing quotes table
-- ============================================================================

-- Add versioning and AI fields to quotes table
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_context JSONB,
ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS approver_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS share_token VARCHAR(255) UNIQUE;

-- Update status check constraint to include new statuses
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check 
CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'approved', 'declined', 'expired', 'superseded'));

-- Create index for versioning queries
CREATE INDEX IF NOT EXISTS idx_quotes_parent_id ON quotes(parent_quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_ticket_id ON quotes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_quotes_share_token ON quotes(share_token);

-- ============================================================================
-- PART 2: Enhance quote_lines table for margins
-- ============================================================================

-- Add cost tracking and line item type to quote_lines
ALTER TABLE quote_lines
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'fixed_fee' CHECK (type IN ('labour', 'parts', 'fixed_fee')),
ADD COLUMN IF NOT EXISTS buy_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'each';

-- Add computed columns for margin (PostgreSQL 12+)
-- Note: These will be calculated in application code for compatibility
-- ALTER TABLE quote_lines
-- ADD COLUMN IF NOT EXISTS margin_amount DECIMAL(10,2) GENERATED ALWAYS AS ((unit_price - COALESCE(buy_cost, 0)) * quantity) STORED,
-- ADD COLUMN IF NOT EXISTS margin_percent DECIMAL(5,2) GENERATED ALWAYS AS (
--   CASE WHEN unit_price > 0 THEN ((unit_price - COALESCE(buy_cost, 0)) / unit_price * 100) ELSE 0 END
-- ) STORED;

-- ============================================================================
-- PART 3: Create quote_templates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS quote_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sector VARCHAR(100),
  description TEXT,
  default_line_items JSONB,
  exclusions TEXT[],
  terms_and_conditions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_templates_org ON quote_templates(organisation_id);
CREATE INDEX IF NOT EXISTS idx_quote_templates_sector ON quote_templates(sector);

-- ============================================================================
-- PART 4: Create transcripts table for call/meeting transcription
-- ============================================================================

CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  filename VARCHAR(255),
  file_path TEXT,
  duration INTEGER, -- seconds
  text TEXT NOT NULL,
  segments JSONB, -- Whisper segments with timestamps
  language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcripts_org ON transcripts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_ticket ON transcripts(ticket_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_quote ON transcripts(quote_id);

-- ============================================================================
-- PART 5: Create ai_extractions table for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  model VARCHAR(50), -- 'gpt-4-turbo', 'gpt-4o', etc.
  extraction_type VARCHAR(50), -- 'ticket', 'quote', 'customer'
  extracted_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2),
  user_accepted BOOLEAN DEFAULT false,
  user_modifications JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_extractions_org ON ai_extractions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_ai_extractions_transcript ON ai_extractions(transcript_id);

-- ============================================================================
-- PART 6: Enhance quote_acceptance for better approval tracking
-- ============================================================================

-- Rename to quote_approvals for consistency
ALTER TABLE IF EXISTS quote_acceptance RENAME TO quote_approvals;

-- Add additional approval tracking fields
ALTER TABLE quote_approvals
ADD COLUMN IF NOT EXISTS approval_method VARCHAR(50) DEFAULT 'link' CHECK (approval_method IN ('link', 'email_reply', 'manual', 'phone')),
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Rename accepted_at to approved_at for consistency
ALTER TABLE quote_approvals RENAME COLUMN accepted_at TO approved_at;
ALTER TABLE quote_approvals RENAME COLUMN accepted_by_name TO approved_by_name;
ALTER TABLE quote_approvals RENAME COLUMN accepted_by_email TO approved_by_email;

-- ============================================================================
-- PART 7: Add helpful functions
-- ============================================================================

-- Function to generate unique quote number
CREATE OR REPLACE FUNCTION generate_quote_number(org_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  year_prefix VARCHAR(4);
  quote_count INTEGER;
  new_number VARCHAR(50);
BEGIN
  year_prefix := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COUNT(*) + 1 INTO quote_count
  FROM quotes
  WHERE organisation_id = org_id
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  new_number := 'Q-' || year_prefix || '-' || LPAD(quote_count::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(255) AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 8: Insert default quote templates
-- ============================================================================

-- IT Support Templates
INSERT INTO quote_templates (organisation_id, name, sector, description, default_line_items, exclusions, terms_and_conditions, is_active)
SELECT 
  id as organisation_id,
  'Remote IT Support - Standard',
  'IT Support',
  'Standard remote IT support service',
  '[
    {"type": "labour", "description": "Remote IT Support", "quantity": 1, "unit": "hours", "sell_price": 75.00},
    {"type": "fixed_fee", "description": "Diagnostic Fee", "quantity": 1, "unit": "service", "sell_price": 50.00}
  ]'::jsonb,
  ARRAY['On-site visits', 'Hardware replacement', 'Data recovery', 'After-hours support'],
  'Payment due within 30 days. Services provided remotely during business hours (9am-5pm).',
  true
FROM organisations
WHERE NOT EXISTS (
  SELECT 1 FROM quote_templates 
  WHERE name = 'Remote IT Support - Standard'
)
LIMIT 1;

INSERT INTO quote_templates (organisation_id, name, sector, description, default_line_items, exclusions, terms_and_conditions, is_active)
SELECT 
  id as organisation_id,
  'On-Site IT Support',
  'IT Support',
  'On-site IT support and troubleshooting',
  '[
    {"type": "labour", "description": "On-Site IT Support", "quantity": 2, "unit": "hours", "sell_price": 95.00},
    {"type": "fixed_fee", "description": "Call-out Fee", "quantity": 1, "unit": "service", "sell_price": 75.00}
  ]'::jsonb,
  ARRAY['Parts and materials', 'Parking fees', 'After-hours surcharge', 'Weekend work'],
  'Payment due within 30 days. Minimum 2-hour charge applies. Travel time included.',
  true
FROM organisations
WHERE NOT EXISTS (
  SELECT 1 FROM quote_templates 
  WHERE name = 'On-Site IT Support'
)
LIMIT 1;

INSERT INTO quote_templates (organisation_id, name, sector, description, default_line_items, exclusions, terms_and_conditions, is_active)
SELECT 
  id as organisation_id,
  'Network Installation - Small Office',
  'IT Support',
  'Small office network setup and configuration',
  '[
    {"type": "labour", "description": "Network Planning & Design", "quantity": 4, "unit": "hours", "sell_price": 85.00},
    {"type": "labour", "description": "Installation & Configuration", "quantity": 8, "unit": "hours", "sell_price": 85.00},
    {"type": "parts", "description": "Network Switch (8-port)", "quantity": 1, "unit": "each", "sell_price": 150.00},
    {"type": "parts", "description": "Cat6 Cabling", "quantity": 100, "unit": "meters", "sell_price": 2.50}
  ]'::jsonb,
  ARRAY['Building modifications', 'Electrical work', 'Internet service provider fees', 'Ongoing maintenance'],
  'Payment: 50% deposit, 50% on completion. 12-month warranty on installation work.',
  true
FROM organisations
WHERE NOT EXISTS (
  SELECT 1 FROM quote_templates 
  WHERE name = 'Network Installation - Small Office'
)
LIMIT 1;

-- ============================================================================
-- PART 9: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE quote_templates IS 'Reusable quote templates for common jobs by sector';
COMMENT ON TABLE transcripts IS 'Audio transcriptions from calls and meetings using Whisper AI';
COMMENT ON TABLE ai_extractions IS 'Audit trail of AI-powered data extractions from transcripts';
COMMENT ON COLUMN quotes.version IS 'Version number for quote revisions (starts at 1)';
COMMENT ON COLUMN quotes.parent_quote_id IS 'References the previous version if this is a revision';
COMMENT ON COLUMN quotes.ai_generated IS 'Flag indicating if this quote was generated by AI';
COMMENT ON COLUMN quotes.ai_context IS 'JSON metadata about AI generation (model, sources, timestamp)';
COMMENT ON COLUMN quote_lines.buy_cost IS 'Internal cost (manager/admin only) for margin calculation';
COMMENT ON COLUMN quote_lines.type IS 'Type of line item: labour, parts, or fixed_fee';
