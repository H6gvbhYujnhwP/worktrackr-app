-- Migration: add supplier column to quote_lines
-- buy_cost already exists from enhance_quotes_for_ai_v2.sql
-- Run once against the production database.

ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS supplier VARCHAR(255);
