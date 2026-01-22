-- Migration: Add Quote-Related Ticket Statuses
-- Date: 2026-01-22
-- Description: Adds new ticket statuses for quote workflow integration

-- Update tickets status constraint to include quote-related statuses
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
    CHECK (status IN (
        -- Pre-quote statuses
        'new',
        'open', 
        'awaiting_info',
        'in_progress',
        
        -- Quote workflow statuses
        'awaiting_quote',
        'quote_sent',
        'quote_accepted',
        'quote_declined',
        'quote_expired',
        
        -- Work statuses
        'scheduled',
        'on_hold',
        
        -- Completion statuses
        'completed',
        'invoiced',
        'closed',
        'cancelled'
    ));

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Added quote-related ticket statuses';
    RAISE NOTICE 'New statuses: awaiting_quote, quote_sent, quote_accepted, quote_declined, quote_expired, scheduled, invoiced';
END $$;
