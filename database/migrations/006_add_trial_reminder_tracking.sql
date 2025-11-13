-- Migration: Add trial reminder tracking to organisations table
-- Date: 2025-11-12
-- Description: Add columns to track which trial reminder emails have been sent

ALTER TABLE organisations 
ADD COLUMN IF NOT EXISTS trial_reminder_7_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_reminder_3_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_reminder_1_sent BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of trial accounts
CREATE INDEX IF NOT EXISTS idx_organisations_trial_end 
ON organisations(trial_end) 
WHERE trial_end IS NOT NULL;

COMMENT ON COLUMN organisations.trial_reminder_7_sent IS 'Whether 7-day trial reminder email has been sent';
COMMENT ON COLUMN organisations.trial_reminder_3_sent IS 'Whether 3-day trial reminder email has been sent';
COMMENT ON COLUMN organisations.trial_reminder_1_sent IS 'Whether 1-day trial reminder email has been sent';
