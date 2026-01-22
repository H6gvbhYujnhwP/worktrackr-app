-- Migration: Add AI Quote Features (Line Item Types and Pricing Configuration)
-- Date: 2026-01-22
-- Description: Adds support for line item types (labour, parts, fixed_fee, recurring) and organisation pricing configuration

-- 1. Add line item type fields to quote_lines table
ALTER TABLE quote_lines
ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'parts' 
  CHECK (item_type IN ('labour', 'parts', 'fixed_fee', 'recurring')),
ADD COLUMN IF NOT EXISTS hours DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS recurrence VARCHAR(20) 
  CHECK (recurrence IN ('monthly', 'annual', NULL));

-- 2. Add AI and workflow fields to quotes table
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS created_via VARCHAR(20) DEFAULT 'manual' 
  CHECK (created_via IN ('manual', 'ai', 'template')),
ADD COLUMN IF NOT EXISTS ai_prompt TEXT,
ADD COLUMN IF NOT EXISTS ai_context_used JSONB,
ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES tickets(id);

-- 3. Create organisation_pricing table for day rates and pricing configuration
CREATE TABLE IF NOT EXISTS organisation_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  
  -- Day rates
  standard_day_rate DECIMAL(10,2) DEFAULT 680.00,
  senior_day_rate DECIMAL(10,2) DEFAULT 850.00,
  junior_day_rate DECIMAL(10,2) DEFAULT 510.00,
  
  -- Hourly rates (calculated from day rates / 8)
  standard_hourly_rate DECIMAL(10,2) DEFAULT 85.00,
  senior_hourly_rate DECIMAL(10,2) DEFAULT 106.25,
  junior_hourly_rate DECIMAL(10,2) DEFAULT 63.75,
  
  -- Markup and margin
  default_markup_percent DECIMAL(5,2) DEFAULT 30.00,
  default_margin_percent DECIMAL(5,2) DEFAULT 25.00,
  
  -- Common services (JSON array of service templates)
  common_services JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one pricing config per organisation
  UNIQUE(organisation_id)
);

-- 4. Create quote_templates table for reusable quote templates
CREATE TABLE IF NOT EXISTS quote_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  
  -- Template info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Template content
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  terms_conditions TEXT,
  valid_until_days INT DEFAULT 30,
  
  -- Reference to original quote (if created from quote)
  created_from_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  
  -- Usage tracking
  use_count INT DEFAULT 0,
  last_used_at TIMESTAMP,
  
  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quote_line_items_item_type ON quote_line_items(item_type);
CREATE INDEX IF NOT EXISTS idx_quotes_created_via ON quotes(created_via);
CREATE INDEX IF NOT EXISTS idx_quotes_ticket_id ON quotes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_quote_templates_org ON quote_templates(organisation_id);
CREATE INDEX IF NOT EXISTS idx_organisation_pricing_org ON organisation_pricing(organisation_id);

-- 6. Insert default pricing for existing organisations
INSERT INTO organisation_pricing (organisation_id, standard_day_rate, senior_day_rate, junior_day_rate, standard_hourly_rate, senior_hourly_rate, junior_hourly_rate)
SELECT id, 680.00, 850.00, 510.00, 85.00, 106.25, 63.75
FROM organisations
WHERE NOT EXISTS (
  SELECT 1 FROM organisation_pricing WHERE organisation_id = organisations.id
);

-- 7. Add comment documentation
COMMENT ON COLUMN quote_lines.item_type IS 'Type of line item: labour (time-based), parts (products), fixed_fee (flat rate), recurring (monthly/annual)';
COMMENT ON COLUMN quote_lines.hours IS 'Number of hours for labour items';
COMMENT ON COLUMN quote_lines.hourly_rate IS 'Hourly rate for labour items';
COMMENT ON COLUMN quote_lines.recurrence IS 'Recurrence period for recurring items: monthly or annual';
COMMENT ON COLUMN quotes.created_via IS 'How the quote was created: manual, ai, or template';
COMMENT ON COLUMN quotes.ai_prompt IS 'Original AI prompt used to generate the quote (if created via AI)';
COMMENT ON COLUMN quotes.ai_context_used IS 'JSON object containing context sources used by AI (ticket, customer, similar quotes, etc.)';
COMMENT ON COLUMN quotes.ticket_id IS 'Reference to the ticket this quote was created from (if applicable)';
COMMENT ON TABLE organisation_pricing IS 'Pricing configuration for AI quote generation and manual quotes';
COMMENT ON TABLE quote_templates IS 'Reusable quote templates for common services';
