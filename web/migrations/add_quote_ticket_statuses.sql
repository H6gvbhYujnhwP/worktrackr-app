-- Migration: Add Quote-Related Ticket Statuses
-- Date: 2026-01-22
-- Description: Adds new ticket statuses for quote workflow integration

-- Update tickets status constraint to include quote-related statuses
-- IMPORTANT: Keep all existing statuses to avoid constraint violations
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
    CHECK (status IN (
        -- Existing statuses (keep all)
        'new',
        'open', 
        'pending',
        'resolved',
        'closed',
        'cancelled',
        'awaiting_info',
        'in_progress',
        
        -- New quote workflow statuses
        'awaiting_quote',
        'quote_sent',
        'quote_accepted',
        'quote_declined',
        'quote_expired',
        
        -- New work statuses
        'scheduled',
        'on_hold',
        'invoiced'
    ));

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Added quote-related ticket statuses';
    RAISE NOTICE 'New statuses: awaiting_quote, quote_sent, quote_accepted, quote_declined, quote_expired, scheduled, invoiced';
END $$;
