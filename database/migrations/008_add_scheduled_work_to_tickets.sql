-- Migration: Add scheduled_work column to tickets table
-- Purpose: Enable calendar events to be saved and displayed for tickets
-- Date: 2026-01-28

-- Add JSONB column to store scheduled work entries
-- Each entry contains: date, startTime, endTime, startDateTime, endDateTime, notes, scheduledBy, scheduledAt
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS scheduled_work JSONB DEFAULT '[]'::jsonb;

-- Create GIN index for efficient querying of scheduled work
CREATE INDEX IF NOT EXISTS idx_tickets_scheduled_work ON tickets USING GIN (scheduled_work);

-- Add comment for documentation
COMMENT ON COLUMN tickets.scheduled_work IS 'Array of scheduled work entries with date, startTime, endTime, notes, etc.';
