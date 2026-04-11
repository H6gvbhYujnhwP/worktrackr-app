-- Migration: add line_notes column to quote_lines
-- unit column already exists from enhance_quotes_for_ai_v2.sql
-- Run once against the production database.

ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS line_notes TEXT;
