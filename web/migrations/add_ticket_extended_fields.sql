-- Migration: Add extended fields to tickets table
-- These fields support contact linking, scheduling, and field service features

-- Add contact_id column to link tickets to contacts
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- Add sector column for field service categorization
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS sector VARCHAR(255);

-- Add scheduled_date column for planned work
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ;

-- Add scheduled_duration_mins column for time allocation
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS scheduled_duration_mins INTEGER;

-- Add method_statement column for work procedures (JSON)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS method_statement JSONB;

-- Add risk_assessment column for safety documentation (JSON)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS risk_assessment JSONB;

-- Create index on contact_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_contact_id ON tickets(contact_id);

-- Create index on scheduled_date for calendar views
CREATE INDEX IF NOT EXISTS idx_tickets_scheduled_date ON tickets(scheduled_date);

-- Create index on sector for filtering
CREATE INDEX IF NOT EXISTS idx_tickets_sector ON tickets(sector);
