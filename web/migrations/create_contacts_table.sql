-- Create contacts table for organization-wide contact management
-- This migration is idempotent and safe to run multiple times
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  
  -- Basic Information
  "type" VARCHAR(20) NOT NULL DEFAULT 'company', -- 'company' or 'individual'
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  
  -- Contact Details
  primary_contact VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),
  
  -- Addresses (stored as JSONB array)
  addresses JSONB DEFAULT '[]'::jsonb,
  
  -- Accounting Information (stored as JSONB)
  accounting JSONB DEFAULT '{}'::jsonb,
  
  -- CRM Data (stored as JSONB)
  crm JSONB DEFAULT '{}'::jsonb,
  
  -- Additional Contact Persons (stored as JSONB array)
  contact_persons JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  
  -- Custom Fields (for extensibility)
  custom_fields JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_contacts_organisation_id ON contacts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts("type");
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by);

-- Create GIN index for JSONB fields
CREATE INDEX IF NOT EXISTS idx_contacts_crm ON contacts USING GIN(crm);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);

-- Add updated_at trigger (only if it doesn't exist)
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_contacts_updated_at'
  ) THEN
    CREATE TRIGGER trigger_contacts_updated_at
      BEFORE UPDATE ON contacts
      FOR EACH ROW
      EXECUTE FUNCTION update_contacts_updated_at();
  END IF;
END $$;
