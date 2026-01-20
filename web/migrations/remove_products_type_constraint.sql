-- Migration to remove CHECK constraint on products.type column
-- This allows free-text category/type values instead of restricting to specific enum values

-- Drop the constraint if it exists
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_type_check;

-- The type column will now accept any text value, matching our application design
-- where users can enter custom categories like "Hosting", "Maintenance", "Support", etc.
