const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Running database migrations...');
    
    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✓ Migrations tracking table ready');
    
    // Get list of already executed migrations
    const executedResult = await pool.query(
      'SELECT filename FROM schema_migrations'
    );
    const executedMigrations = new Set(executedResult.rows.map(row => row.filename));
    
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ensure migrations run in alphabetical order
    
    let migrationsRun = 0;
    
    for (const file of migrationFiles) {
      // Skip if already executed
      if (executedMigrations.has(file)) {
        console.log(`⊘ Skipping ${file} (already executed)`);
        continue;
      }
      
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Run migration in a transaction
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await pool.query('COMMIT');
        console.log(`✓ Migration ${file} completed`);
        migrationsRun++;
      } catch (error) {
        await pool.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${error.message}`);
      }
    }
    
    if (migrationsRun === 0) {
      console.log('No new migrations to run');
    } else {
      console.log(`All migrations completed successfully (${migrationsRun} new migrations)`);
    }
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to run migrations:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
