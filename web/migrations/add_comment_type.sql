-- Migration: add comment_type to comments table
-- Allows distinguishing updates / internal notes / system events / approval requests
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS comment_type VARCHAR(30) NOT NULL DEFAULT 'update'
    CHECK (comment_type IN ('update', 'internal', 'system', 'approval_request'));

CREATE INDEX IF NOT EXISTS idx_comments_type ON comments(ticket_id, comment_type);

COMMENT ON COLUMN comments.comment_type IS
  'update = team-visible update | internal = staff-only note | system = auto-posted event | approval_request = approval card';
