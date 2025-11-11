-- Migration: Remove 'individual' plan from CHECK constraint
-- Date: 2025-11-11
-- Description: Updates the plan CHECK constraint to only allow starter, pro, enterprise

-- Drop the existing CHECK constraint
ALTER TABLE organisations DROP CONSTRAINT IF EXISTS organisations_plan_check;

-- Add the new CHECK constraint without 'individual'
ALTER TABLE organisations 
ADD CONSTRAINT organisations_plan_check 
CHECK (plan IN ('starter', 'pro', 'enterprise'));

-- Update any organisations that might have 'individual' plan to 'starter'
UPDATE organisations 
SET plan = 'starter', included_seats = 1
WHERE plan = 'individual';

-- Verify the migration
SELECT plan, COUNT(*) as count
FROM organisations
GROUP BY plan
ORDER BY plan;
