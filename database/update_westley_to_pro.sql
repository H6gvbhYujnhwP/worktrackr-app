-- Update Westley's organization to Pro plan with correct limits
-- This script should be run on the production database

-- Find Westley's organization
SELECT o.id, o.name, o.plan, o.included_seats, u.email 
FROM organisations o 
JOIN memberships m ON o.id = m.organisation_id 
JOIN users u ON m.user_id = u.id 
WHERE u.email = 'westley@sweetbyte.co.uk';

-- Update to Pro plan with 10 user limit
UPDATE organisations 
SET 
  plan = 'pro',
  included_seats = 10,
  updated_at = NOW()
WHERE id IN (
  SELECT o.id 
  FROM organisations o 
  JOIN memberships m ON o.id = m.organisation_id 
  JOIN users u ON m.user_id = u.id 
  WHERE u.email = 'westley@sweetbyte.co.uk'
);

-- Verify the update
SELECT o.id, o.name, o.plan, o.included_seats, u.email 
FROM organisations o 
JOIN memberships m ON o.id = m.organisation_id 
JOIN users u ON m.user_id = u.id 
WHERE u.email = 'westley@sweetbyte.co.uk';
