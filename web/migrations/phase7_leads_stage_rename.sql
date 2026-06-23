-- Phase 7 (Leads) — rename the 'suspect' sales stage to 'new'.
-- The sales stage lives in contacts.crm (JSONB), so there is no DB CHECK constraint
-- to alter; we only migrate existing stored values. Idempotent: a re-run finds no
-- remaining 'suspect' rows and changes nothing. No money figures — purely a
-- label/value migration. Filename 'phase7_' sorts after the phase6 migrations,
-- so it runs last on boot.

UPDATE contacts
SET crm = jsonb_set(crm, '{salesStage}', '"new"', true)
WHERE crm->>'salesStage' = 'suspect';
