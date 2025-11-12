-- Migration: Add Admin System
-- Description: Add admin fields to users, create audit log table, add cancellation tracking
-- Date: 2025-11-12

-- 1. Add admin fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_master_admin BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users(is_suspended);
CREATE INDEX IF NOT EXISTS idx_users_is_master_admin ON users(is_master_admin);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- 2. Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_id UUID,
    target_type VARCHAR(50),
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 3. Add cancellation tracking to organisations
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS cancellation_comment TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 4. Add index for email search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 005_add_admin_system completed successfully';
END $$;
