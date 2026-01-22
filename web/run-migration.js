const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration(migrationFile) {
  const sqlPath = path.join(__dirname, 'migrations', migrationFile);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log(`Running migration: ${migrationFile}`);
  
  try {
    await pool.query(sql);
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const migrationFile = process.argv[2] || 'add_ai_quote_features.sql';
runMigration(migrationFile);
