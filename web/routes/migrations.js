const express = require('express');
const router = express.Router();
const { query } = require('../../shared/db');
const fs = require('fs');
const path = require('path');

// Run database migrations
router.post('/run', async (req, res) => {
  try {
    const { adminKey } = req.body;
    
    // Check admin key
    const expectedKey = process.env.ADMIN_API_KEY || 'worktrackr-admin-2025';
    if (adminKey !== expectedKey) {
      console.log('❌ Invalid admin key for migration');
      return res.status(403).json({ error: 'Invalid admin key' });
    }
    
    console.log('🔧 Running database migrations...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../../database/migrations/001_add_plan_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing migration: 001_add_plan_columns.sql');
    
    // Execute migration
    const result = await query(migrationSQL);
    
    console.log('✅ Migration completed successfully');
    
    // Verify columns exist
    const verifyResult = await query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'organisations' 
      AND column_name IN ('plan', 'included_seats', 'active_user_count')
      ORDER BY column_name
    `);
    
    res.json({
      success: true,
      message: 'Migration completed successfully',
      columns: verifyResult.rows
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Migration failed',
      details: error.message
    });
  }
});

module.exports = router;
