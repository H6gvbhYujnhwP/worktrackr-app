-- Add the per-connection IDYQ org reference to idyq_connection.
-- The create migration already ran on production, so this ALTER adds the column
-- there. On a fresh DB the create migration (which now includes the column)
-- runs first (alphabetically 'create_' < 'idyq_'), so this is a harmless no-op.
-- Stores which IDYQ org this WorkTrackr org reads from (slug or numeric id).

ALTER TABLE idyq_connection ADD COLUMN IF NOT EXISTS idyq_org_ref TEXT;
