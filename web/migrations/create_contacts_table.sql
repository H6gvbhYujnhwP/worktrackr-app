-- Drop the contacts table if it exists (to handle failed previous migrations)
DROP TABLE IF EXISTS contacts CASCADE;

-- Create contacts table for organization-wide contact management
CREATE TABLE contacts (
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

-- Create indexes for performance
CREATE INDEX idx_contacts_organisation_id ON contacts(organisation_id);
CREATE INDEX idx_contacts_type ON contacts("type");
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_name ON contacts(name);
CREATE INDEX idx_contacts_created_by ON contacts(created_by);

-- Create GIN index for JSONB fields
CREATE INDEX idx_contacts_crm ON contacts USING GIN(crm);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();
