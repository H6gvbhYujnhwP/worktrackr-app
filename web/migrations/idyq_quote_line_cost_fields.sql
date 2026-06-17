-- Add buy-in cost, profit and line type to mirrored IDYQ quote lines.
-- These carry the quote's own per-line economics (edited in IdoYourQuotes, where
-- the customer quote lives) so WorkTrackr can show profit on pulled order lines
-- and feed the commission engine with the correct basis (one-off vs recurring).
-- Read-only mirror: WorkTrackr never writes these back to IDYQ.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS) — safe to re-run. Named to sort AFTER
-- create_idyq_integration_tables.sql so a fresh database builds in order.

ALTER TABLE idyq_quote_lines ADD COLUMN IF NOT EXISTS cost_price  NUMERIC; -- buy-in ex VAT, per unit
ALTER TABLE idyq_quote_lines ADD COLUMN IF NOT EXISTS line_profit NUMERIC; -- line profit ex VAT (sell − buy-in × qty)
ALTER TABLE idyq_quote_lines ADD COLUMN IF NOT EXISTS line_type   TEXT;    -- 'one_off' | 'annual' | 'monthly' …
