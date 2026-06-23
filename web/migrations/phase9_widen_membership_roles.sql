-- Phase 9 — widen memberships.role to add the Salesman and Engineer roles.
--
-- The base schema (database/schema.sql) created memberships.role with an inline
-- column CHECK, which Postgres auto-names <table>_<column>_check, i.e.
-- memberships_role_check (same pattern remove_products_type_constraint.sql relies
-- on). We drop that narrow constraint and re-add a widened one so an org can
-- assign 'salesman' / 'engineer' in the Users screen and get the role-based home
-- screens (Salesman -> commission, Engineer -> wage progression).
--
-- Adds NO new role to anyone — it only permits the two new values. Existing
-- admin/manager/staff rows are untouched. Idempotent: safe to re-run (DROP IF
-- EXISTS then ADD). partner_memberships.role is a separate constraint, left as-is.

ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_check;

ALTER TABLE memberships
  ADD CONSTRAINT memberships_role_check
  CHECK (role IN ('admin', 'manager', 'staff', 'salesman', 'engineer'));
