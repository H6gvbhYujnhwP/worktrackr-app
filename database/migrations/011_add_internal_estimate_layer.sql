-- WorkTrackr Universal Tender-Aware Quote System - Phase 2
-- Migration: Internal Estimates Layer (Private Thinking Space)
-- Version: 1.0.0
-- Date: 2026-02-02
-- Description: Adds internal estimation layer - private workspace for quantities, costs, risk, margin

-- ============================================================================
-- PART 1: INTERNAL ESTIMATES (Main Container)
-- ============================================================================
-- Private thinking space where humans (with AI help) work out the quote

CREATE TABLE IF NOT EXISTS internal_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    tender_context_id UUID REFERENCES tender_contexts(id) ON DELETE SET NULL,
    
    -- Summary/notes (rich text workspace)
    summary TEXT, -- Markdown/rich text summary of the estimate
    assumptions TEXT, -- Key assumptions made
    risks TEXT, -- Identified risks
    exclusions TEXT, -- What's NOT included
    
    -- Overall estimate figures (calculated from items)
    total_cost DECIMAL(12,2) DEFAULT 0, -- Sum of all item costs
    total_hours DECIMAL(10,2) DEFAULT 0, -- Sum of all labour hours
    target_margin_percent DECIMAL(5,2), -- Desired margin %
    calculated_sell_price DECIMAL(12,2), -- Cost + margin
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'ready', 'transferred')),
    
    -- Audit
    created_by UUID REFERENCES users(id),
    last_edited_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One internal estimate per quote
    CONSTRAINT unique_quote_estimate UNIQUE (quote_id)
);

CREATE INDEX IF NOT EXISTS idx_internal_estimates_org ON internal_estimates(organisation_id);
CREATE INDEX IF NOT EXISTS idx_internal_estimates_quote ON internal_estimates(quote_id);

-- ============================================================================
-- PART 2: ESTIMATE ITEMS (Line-Level Detail)
-- ============================================================================
-- Individual items in the estimate - NOT quote lines, just internal workings

CREATE TABLE IF NOT EXISTS estimate_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_estimate_id UUID NOT NULL REFERENCES internal_estimates(id) ON DELETE CASCADE,
    
    -- Item details
    description TEXT NOT NULL,
    category VARCHAR(50), -- 'labour', 'materials', 'equipment', 'subcontract', 'overhead', 'other'
    
    -- Quantities and costs
    quantity DECIMAL(12,4),
    unit VARCHAR(50), -- 'hours', 'days', 'each', 'sqm', 'linear_m', 'kg', etc.
    unit_cost DECIMAL(12,4), -- Cost per unit
    total_cost DECIMAL(12,2), -- quantity * unit_cost
    
    -- Labour-specific fields
    hours DECIMAL(10,2),
    hourly_rate DECIMAL(10,2),
    
    -- Traceability - where did this item come from?
    source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'ai_suggested', 'imported', 'calculated')),
    source_reference TEXT, -- Reference to tender symbol, file, or calculation
    
    -- Confidence tracking (per your spec)
    confidence_status VARCHAR(20) DEFAULT 'needs_review' 
        CHECK (confidence_status IN ('confirmed', 'needs_review', 'unknown')),
    
    -- Notes and reasoning
    notes TEXT, -- Internal notes about this item
    calculation_notes TEXT, -- How the quantity/cost was derived
    
    -- Grouping
    section VARCHAR(100), -- For grouping items (e.g., "First Fix", "Ground Floor")
    sort_order INTEGER DEFAULT 0,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate ON estimate_items(internal_estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_items_confidence ON estimate_items(confidence_status);
CREATE INDEX IF NOT EXISTS idx_estimate_items_category ON estimate_items(category);

-- ============================================================================
-- PART 3: ESTIMATE ITEM LINKS (Traceability to Tender Symbols)
-- ============================================================================
-- Link estimate items back to tender symbols for full traceability

CREATE TABLE IF NOT EXISTS estimate_item_symbol_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_item_id UUID NOT NULL REFERENCES estimate_items(id) ON DELETE CASCADE,
    tender_symbol_id UUID NOT NULL REFERENCES tender_symbols(id) ON DELETE CASCADE,
    quantity_from_symbol DECIMAL(12,4), -- How many of this symbol contributed
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_item_symbol_link UNIQUE (estimate_item_id, tender_symbol_id)
);

CREATE INDEX IF NOT EXISTS idx_item_symbol_links_item ON estimate_item_symbol_links(estimate_item_id);
CREATE INDEX IF NOT EXISTS idx_item_symbol_links_symbol ON estimate_item_symbol_links(tender_symbol_id);

-- ============================================================================
-- PART 4: HELPER FUNCTIONS
-- ============================================================================

-- Function to recalculate estimate totals
CREATE OR REPLACE FUNCTION recalculate_estimate_totals(p_estimate_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_cost DECIMAL(12,2);
    v_total_hours DECIMAL(10,2);
BEGIN
    -- Calculate totals from items
    SELECT 
        COALESCE(SUM(total_cost), 0),
        COALESCE(SUM(hours), 0)
    INTO v_total_cost, v_total_hours
    FROM estimate_items
    WHERE internal_estimate_id = p_estimate_id;
    
    -- Update the estimate
    UPDATE internal_estimates
    SET 
        total_cost = v_total_cost,
        total_hours = v_total_hours,
        calculated_sell_price = CASE 
            WHEN target_margin_percent IS NOT NULL AND target_margin_percent > 0 
            THEN v_total_cost / (1 - (target_margin_percent / 100))
            ELSE v_total_cost
        END,
        updated_at = NOW()
    WHERE id = p_estimate_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get unconfirmed estimate items
CREATE OR REPLACE FUNCTION get_unconfirmed_estimate_items(p_estimate_id UUID)
RETURNS TABLE (
    id UUID,
    description TEXT,
    confidence_status VARCHAR(20),
    source VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ei.id,
        ei.description,
        ei.confidence_status,
        ei.source
    FROM estimate_items ei
    WHERE ei.internal_estimate_id = p_estimate_id
    AND ei.confidence_status != 'confirmed'
    ORDER BY ei.sort_order, ei.created_at;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: TRIGGERS
-- ============================================================================

-- Auto-recalculate totals when items change
CREATE OR REPLACE FUNCTION trigger_recalculate_estimate()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculate_estimate_totals(OLD.internal_estimate_id);
        RETURN OLD;
    ELSE
        -- Calculate total_cost if not provided
        IF NEW.total_cost IS NULL AND NEW.quantity IS NOT NULL AND NEW.unit_cost IS NOT NULL THEN
            NEW.total_cost := NEW.quantity * NEW.unit_cost;
        END IF;
        
        -- Calculate total_cost from hours if labour
        IF NEW.total_cost IS NULL AND NEW.hours IS NOT NULL AND NEW.hourly_rate IS NOT NULL THEN
            NEW.total_cost := NEW.hours * NEW.hourly_rate;
        END IF;
        
        PERFORM recalculate_estimate_totals(NEW.internal_estimate_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_estimate_item_changed
    AFTER INSERT OR UPDATE OR DELETE ON estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_estimate();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_estimate_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_internal_estimate_updated
    BEFORE UPDATE ON internal_estimates
    FOR EACH ROW
    EXECUTE FUNCTION update_estimate_timestamp();

CREATE TRIGGER trigger_estimate_item_updated
    BEFORE UPDATE ON estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION update_estimate_timestamp();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next: Run Phase 3 migration for quote_sections and quote_lines traceability
