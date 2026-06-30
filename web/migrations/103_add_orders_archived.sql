-- Soft-delete (archive) support for sales orders.
-- "Delete" archives an order (hides it from the normal list) rather than destroying
-- it; managers/admins can view the archive to restore or permanently remove.
-- Idempotent so a re-run on boot never crashes.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived_by UUID;

CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(organisation_id, archived_at);
