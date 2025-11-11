-- Migration: Add plan and included_seats columns to organisations table
-- Date: 2025-11-10
-- Description: Adds subscription plan management columns

-- Add plan column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organisations' AND column_name = 'plan'
    ) THEN
        ALTER TABLE organisations 
        ADD COLUMN plan VARCHAR(20) DEFAULT 'starter' 
        CHECK (plan IN ('starter', 'pro', 'enterprise'));
        
        RAISE NOTICE 'Added plan column to organisations table';
    ELSE
        RAISE NOTICE 'plan column already exists in organisations table';
    END IF;
END $$;

-- Add included_seats column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organisations' AND column_name = 'included_seats'
    ) THEN
        ALTER TABLE organisations 
        ADD COLUMN included_seats INTEGER DEFAULT 1;
        
        RAISE NOTICE 'Added included_seats column to organisations table';
    ELSE
        RAISE NOTICE 'included_seats column already exists in organisations table';
    END IF;
END $$;

-- Add active_user_count column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organisations' AND column_name = 'active_user_count'
    ) THEN
        ALTER TABLE organisations 
        ADD COLUMN active_user_count INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Added active_user_count column to organisations table';
    ELSE
        RAISE NOTICE 'active_user_count column already exists in organisations table';
    END IF;
END $$;

-- Update existing organisations to have correct default values
UPDATE organisations 
SET 
    plan = COALESCE(plan, 'starter'),
    included_seats = COALESCE(included_seats, 1),
    active_user_count = COALESCE(active_user_count, 0)
WHERE plan IS NULL OR included_seats IS NULL OR active_user_count IS NULL;

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'organisations' 
AND column_name IN ('plan', 'included_seats', 'active_user_count')
ORDER BY column_name;
