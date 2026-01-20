-- Migration for crm_events table

CREATE TABLE IF NOT EXISTS crm_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Event Details
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('call', 'meeting', 'follow_up', 'renewal', 'other')),
    description TEXT,
    
    -- Scheduling
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    
    -- Assignment & Status
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done', 'cancelled')),
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_time_range CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_crm_events_organisation ON crm_events(organisation_id);
CREATE INDEX IF NOT EXISTS idx_crm_events_contact ON crm_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_events_assigned_user ON crm_events(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_events_date_range ON crm_events(organisation_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_crm_events_status ON crm_events(organisation_id, status);
