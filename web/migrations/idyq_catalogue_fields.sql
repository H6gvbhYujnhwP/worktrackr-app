-- Add the extra IDYQ catalogue fields to idyq_products on existing databases.
-- (The create migration already ran in production; on fresh DBs it now includes
-- these columns, so these ALTERs are a no-op there.)
ALTER TABLE idyq_products ADD COLUMN IF NOT EXISTS unit          TEXT;
ALTER TABLE idyq_products ADD COLUMN IF NOT EXISTS cost_price    NUMERIC;
ALTER TABLE idyq_products ADD COLUMN IF NOT EXISTS install_hours NUMERIC;
ALTER TABLE idyq_products ADD COLUMN IF NOT EXISTS pricing_type  TEXT;
