-- WorkTrackr Universal Tender-Aware Quote System - Phase 1
-- Migration: Tender Contexts and Tender Symbols (Interpretation Layer)
-- Version: 1.0.0
-- Date: 2026-02-02
-- Description: Adds tender-scoped interpretation layer for universal quoting

-- ============================================================================
-- PART 1: TENDER CONTEXTS
-- ============================================================================
-- Each quote is associated with a tender context that scopes all interpretations

CREATE TABLE IF NOT EXISTS tender_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    name VARCHAR(255), -- Optional tender name/reference
    description TEXT, -- Brief description of the tender
    client_name VARCHAR(255), -- Client/company issuing the tender
    tender_reference VARCHAR(100), -- External tender reference number
    submission_deadline TIMESTAMPTZ, -- When the tender must be submitted
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one tender context per quote
    CONSTRAINT unique_quote_tender UNIQUE (quote_id)
);

-- Index for fast lookups by organisation
CREATE INDEX IF NOT EXISTS idx_tender_contexts_org ON tender_contexts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_tender_contexts_quote ON tender_contexts(quote_id);

-- ============================================================================
-- PART 2: TENDER FILES (Uploaded Documents)
-- ============================================================================
-- Track all files uploaded for a tender (drawings, specs, schedules, etc.)

CREATE TABLE IF NOT EXISTS tender_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_context_id UUID NOT NULL REFERENCES tender_contexts(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Storage path or URL
    file_size INTEGER, -- Size in bytes
    mime_type VARCHAR(100),
    file_type VARCHAR(50) DEFAULT 'document', -- 'drawing', 'specification', 'schedule', 'audio', 'image', 'other'
    description TEXT, -- User notes about this file
    processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    ai_extracted_text TEXT, -- OCR/transcription output
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tender_files_context ON tender_files(tender_context_id);

-- ============================================================================
-- PART 3: TENDER SYMBOLS (Human-Approved Interpretations)
-- ============================================================================
-- Tender-scoped symbol/abbreviation map - NEVER reused globally

CREATE TABLE IF NOT EXISTS tender_symbols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_context_id UUID NOT NULL REFERENCES tender_contexts(id) ON DELETE CASCADE,
    symbol_or_term VARCHAR(100) NOT NULL, -- The symbol, abbreviation, or term
    interpreted_meaning TEXT NOT NULL, -- What it means FOR THIS TENDER ONLY
    category VARCHAR(50), -- 'symbol', 'abbreviation', 'term', 'legend', 'note'
    source_file_id UUID REFERENCES tender_files(id), -- Which file it came from
    source_location TEXT, -- Page/section reference
    notes TEXT, -- Additional context or reasoning
    
    -- Confidence tracking (AI-suggested vs human-confirmed)
    confidence_status VARCHAR(20) DEFAULT 'needs_review' 
        CHECK (confidence_status IN ('confirmed', 'needs_review', 'unknown')),
    suggested_by VARCHAR(20) DEFAULT 'manual' CHECK (suggested_by IN ('ai', 'manual')),
    
    -- Approval tracking
    approved_by_user_id UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate symbols within same tender
    CONSTRAINT unique_tender_symbol UNIQUE (tender_context_id, symbol_or_term)
);

CREATE INDEX IF NOT EXISTS idx_tender_symbols_context ON tender_symbols(tender_context_id);
CREATE INDEX IF NOT EXISTS idx_tender_symbols_confidence ON tender_symbols(confidence_status);

-- ============================================================================
-- PART 4: HELPER FUNCTIONS
-- ============================================================================

-- Function to get all unconfirmed symbols for a tender
CREATE OR REPLACE FUNCTION get_unconfirmed_symbols(p_tender_context_id UUID)
RETURNS TABLE (
    id UUID,
    symbol_or_term VARCHAR(100),
    interpreted_meaning TEXT,
    confidence_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.symbol_or_term,
        ts.interpreted_meaning,
        ts.confidence_status
    FROM tender_symbols ts
    WHERE ts.tender_context_id = p_tender_context_id
    AND ts.confidence_status != 'confirmed'
    ORDER BY ts.created_at;
END;
$$ LANGUAGE plpgsql;

-- Function to confirm a symbol interpretation
CREATE OR REPLACE FUNCTION confirm_tender_symbol(
    p_symbol_id UUID,
    p_user_id UUID,
    p_meaning TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE tender_symbols
    SET 
        confidence_status = 'confirmed',
        interpreted_meaning = COALESCE(p_meaning, interpreted_meaning),
        approved_by_user_id = p_user_id,
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_symbol_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: AUDIT TRIGGER
-- ============================================================================

-- Update timestamp trigger for tender_contexts
CREATE OR REPLACE FUNCTION update_tender_context_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tender_context_updated
    BEFORE UPDATE ON tender_contexts
    FOR EACH ROW
    EXECUTE FUNCTION update_tender_context_timestamp();

-- Update timestamp trigger for tender_symbols
CREATE TRIGGER trigger_tender_symbol_updated
    BEFORE UPDATE ON tender_symbols
    FOR EACH ROW
    EXECUTE FUNCTION update_tender_context_timestamp();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next: Run Phase 2 migration for internal_estimates and estimate_items
