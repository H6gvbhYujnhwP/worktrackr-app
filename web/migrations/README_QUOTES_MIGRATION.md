# Quotes System Enhancement Migration

## Overview

This migration enhances the existing quotes system to support:
- **AI-powered quote generation**
- **Quote versioning and revisions**
- **Margin tracking** (buy cost vs sell price)
- **Call/meeting transcription**
- **Quote templates**
- **Enhanced approval tracking**

## Files

- `enhance_quotes_for_ai.sql` - Main migration file

## How to Run

### Option 1: Via Database Client (Recommended for Production)

```bash
# Using psql
psql $DATABASE_URL -f web/migrations/enhance_quotes_for_ai.sql

# Or using any PostgreSQL client
# Connect to your database and run the SQL file
```

### Option 2: Via Node.js Script

```javascript
const fs = require('fs');
const { pool } = require('./shared/db');

async function runMigration() {
  const sql = fs.readFileSync('./web/migrations/enhance_quotes_for_ai.sql', 'utf8');
  await pool.query(sql);
  console.log('Migration completed!');
}

runMigration().catch(console.error);
```

### Option 3: Via Render.com Shell

1. Go to Render.com dashboard
2. Select your web service
3. Click "Shell" tab
4. Run:
```bash
cd /opt/render/project/src
node -e "const fs=require('fs');const {pool}=require('./shared/db');(async()=>{await pool.query(fs.readFileSync('./web/migrations/enhance_quotes_for_ai.sql','utf8'));console.log('Done');process.exit(0)})().catch(e=>{console.error(e);process.exit(1)})"
```

## What This Migration Does

### 1. Enhances `quotes` Table
- Adds `version` column for revision tracking
- Adds `parent_quote_id` for version history
- Adds `ai_generated` flag
- Adds `ai_context` JSONB for AI metadata
- Adds `ticket_id` to link quotes to tickets
- Adds `share_token` for secure public links
- Updates status constraint to include 'superseded'

### 2. Enhances `quote_lines` Table
- Adds `type` column (labour, parts, fixed_fee)
- Adds `buy_cost` for margin calculations
- Adds `unit` column for better quantity tracking

### 3. Creates `quote_templates` Table
- Stores reusable quote templates
- Sector-specific templates
- Default line items in JSONB
- Standard exclusions and T&Cs

### 4. Creates `transcripts` Table
- Stores audio transcriptions from Whisper AI
- Links to tickets and quotes
- Stores segments with timestamps

### 5. Creates `ai_extractions` Table
- Audit trail for AI operations
- Stores extracted data
- Tracks user modifications
- Confidence scores

### 6. Renames `quote_acceptance` to `quote_approvals`
- More consistent naming
- Adds `approval_method` field
- Adds `approval_notes` field

### 7. Adds Helper Functions
- `generate_quote_number(org_id)` - Auto-generates quote numbers
- `generate_share_token()` - Creates secure tokens

### 8. Inserts Default Templates
- Remote IT Support - Standard
- On-Site IT Support
- Network Installation - Small Office

## Rollback

If you need to rollback this migration:

```sql
-- Drop new tables
DROP TABLE IF EXISTS ai_extractions CASCADE;
DROP TABLE IF EXISTS transcripts CASCADE;
DROP TABLE IF EXISTS quote_templates CASCADE;

-- Rename quote_approvals back
ALTER TABLE quote_approvals RENAME TO quote_acceptance;

-- Remove added columns from quotes
ALTER TABLE quotes 
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS parent_quote_id,
  DROP COLUMN IF EXISTS ai_generated,
  DROP COLUMN IF EXISTS ai_context,
  DROP COLUMN IF EXISTS ticket_id,
  DROP COLUMN IF EXISTS approved_by,
  DROP COLUMN IF EXISTS approver_email,
  DROP COLUMN IF EXISTS share_token;

-- Remove added columns from quote_lines
ALTER TABLE quote_lines
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS buy_cost,
  DROP COLUMN IF EXISTS unit;

-- Drop functions
DROP FUNCTION IF EXISTS generate_quote_number(UUID);
DROP FUNCTION IF EXISTS generate_share_token();
```

## Testing

After running the migration, verify:

```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quotes' 
AND column_name IN ('version', 'ai_generated', 'share_token');

-- Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('quote_templates', 'transcripts', 'ai_extractions');

-- Check templates were inserted
SELECT name, sector FROM quote_templates;
```

## Next Steps

After migration:
1. Implement API endpoints for quotes CRUD
2. Build Quote tab UI in ticket detail view
3. Integrate OpenAI for AI generation
4. Test quote creation and approval flow
