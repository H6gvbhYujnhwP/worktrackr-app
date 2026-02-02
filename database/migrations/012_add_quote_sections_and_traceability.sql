-- WorkTrackr Universal Tender-Aware Quote System - Phase 3
-- Migration: Quote Sections and Line Item Traceability
-- Version: 1.0.0
-- Date: 2026-02-02
-- Description: Adds quote sections for grouping and traceability fields to quote_lines

-- ============================================================================
-- PART 1: QUOTE SECTIONS (Grouping for Client-Facing Quote)
-- ============================================================================
-- Sections allow grouping of quote lines (e.g., "First Fix", "Materials", "Labour")

CREATE TABLE IF NOT EXISTS quote_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    
    -- Optional: Link to estimate section for traceability
    source_section VARCHAR(100), -- Name of section from internal estimate
    
    -- Subtotals (calculated from lines in this section)
    subtotal DECIMAL(12,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_sections_quote ON quote_sections(quote_id);

-- ============================================================================
-- PART 2: ADD TRACEABILITY FIELDS TO QUOTE_LINES
-- ============================================================================
-- Per spec: source + origin_type + origin_id for full traceability

-- Add section_id to link lines to sections
ALTER TABLE quote_lines 
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES quote_sections(id) ON DELETE SET NULL;

-- Add traceability fields
ALTER TABLE quote_lines 
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual' 
    CHECK (source IN ('manual', 'ai_suggested', 'imported', 'from_estimate'));

ALTER TABLE quote_lines 
ADD COLUMN IF NOT EXISTS origin_type VARCHAR(50);
-- Values: 'estimate_item', 'product', 'tender_symbol', 'ai_generated', 'manual', etc.

ALTER TABLE quote_lines 
ADD COLUMN IF NOT EXISTS origin_id UUID;
-- References the ID of the source record (estimate_item.id, product.id, etc.)

-- Add sort_order for explicit ordering within sections
ALTER TABLE quote_lines 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create indexes for traceability queries
CREATE INDEX IF NOT EXISTS idx_quote_lines_section ON quote_lines(section_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_origin ON quote_lines(origin_type, origin_id);

-- ============================================================================
-- PART 3: HELPER FUNCTIONS
-- ============================================================================

-- Function to recalculate section subtotals
CREATE OR REPLACE FUNCTION recalculate_section_subtotal(p_section_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE quote_sections
    SET 
        subtotal = (
            SELECT COALESCE(SUM(quantity * rate), 0)
            FROM quote_lines
            WHERE section_id = p_section_id
        ),
        updated_at = NOW()
    WHERE id = p_section_id;
END;
$$ LANGUAGE plpgsql;

-- Function to transfer estimate items to quote lines
CREATE OR REPLACE FUNCTION transfer_estimate_to_quote(
    p_estimate_id UUID,
    p_quote_id UUID,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_item RECORD;
    v_section_id UUID;
    v_section_name VARCHAR(100);
BEGIN
    -- Loop through confirmed estimate items
    FOR v_item IN 
        SELECT * FROM estimate_items 
        WHERE internal_estimate_id = p_estimate_id 
        AND confidence_status = 'confirmed'
        ORDER BY section NULLS LAST, sort_order
    LOOP
        -- Create or get section
        v_section_name := COALESCE(v_item.section, 'General');
        
        SELECT id INTO v_section_id
        FROM quote_sections
        WHERE quote_id = p_quote_id AND name = v_section_name;
        
        IF v_section_id IS NULL THEN
            INSERT INTO quote_sections (quote_id, name, source_section)
            VALUES (p_quote_id, v_section_name, v_item.section)
            RETURNING id INTO v_section_id;
        END IF;
        
        -- Create quote line from estimate item
        INSERT INTO quote_lines (
            quote_id, section_id, description, quantity, unit, rate,
            source, origin_type, origin_id, sort_order
        ) VALUES (
            p_quote_id,
            v_section_id,
            v_item.description,
            COALESCE(v_item.quantity, v_item.hours, 1),
            COALESCE(v_item.unit, 'each'),
            COALESCE(v_item.unit_cost, v_item.hourly_rate, v_item.total_cost),
            'from_estimate',
            'estimate_item',
            v_item.id,
            v_item.sort_order
        );
        
        v_count := v_count + 1;
    END LOOP;
    
    -- Update estimate status
    UPDATE internal_estimates
    SET status = 'transferred', updated_at = NOW()
    WHERE id = p_estimate_id;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 4: TRIGGERS
-- ============================================================================

-- Trigger to update section subtotals when quote lines change
CREATE OR REPLACE FUNCTION trigger_update_section_subtotal()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.section_id IS NOT NULL THEN
            PERFORM recalculate_section_subtotal(OLD.section_id);
        END IF;
        RETURN OLD;
    ELSE
        IF NEW.section_id IS NOT NULL THEN
            PERFORM recalculate_section_subtotal(NEW.section_id);
        END IF;
        IF OLD.section_id IS NOT NULL AND OLD.section_id != NEW.section_id THEN
            PERFORM recalculate_section_subtotal(OLD.section_id);
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_quote_line_section_update'
    ) THEN
        CREATE TRIGGER trigger_quote_line_section_update
            AFTER INSERT OR UPDATE OR DELETE ON quote_lines
            FOR EACH ROW
            EXECUTE FUNCTION trigger_update_section_subtotal();
    END IF;
END
$$;

-- ============================================================================
-- PART 5: VIEWS FOR REPORTING
-- ============================================================================

-- View to see quote lines with their traceability info
CREATE OR REPLACE VIEW quote_lines_with_traceability AS
SELECT 
    ql.*,
    qs.name as section_name,
    qs.sort_order as section_sort_order,
    CASE 
        WHEN ql.origin_type = 'estimate_item' THEN ei.description
        WHEN ql.origin_type = 'product' THEN p.name
        ELSE NULL
    END as origin_description,
    CASE 
        WHEN ql.origin_type = 'estimate_item' THEN ei.confidence_status
        ELSE 'confirmed'
    END as origin_confidence
FROM quote_lines ql
LEFT JOIN quote_sections qs ON ql.section_id = qs.id
LEFT JOIN estimate_items ei ON ql.origin_type = 'estimate_item' AND ql.origin_id = ei.id
LEFT JOIN products p ON ql.origin_type = 'product' AND ql.origin_id = p.id;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The quote system now supports:
-- 1. Sections for grouping quote lines
-- 2. Full traceability from quote line back to source (estimate, product, AI, manual)
-- 3. Automatic section subtotal calculation
-- 4. Transfer function to move confirmed estimate items to quote lines
