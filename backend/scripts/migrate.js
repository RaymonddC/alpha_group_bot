#!/usr/bin/env node
/**
 * Production migration runner
 * Tracks applied migrations in _migration_history table
 * Safe to run multiple times — skips already-applied migrations
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function runMigrations() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create migration tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migration_history (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Get list of already-applied migrations
    const { rows } = await client.query('SELECT filename FROM _migration_history ORDER BY filename');
    const applied = new Set(rows.map(r => r.filename));

    // Get all migration files in order
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql') && !f.startsWith('dev_'))
      .sort();

    let ran = 0;
    let skipped = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  SKIP  ${file}`);
        skipped++;
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`  RUN   ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migration_history (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`  DONE  ${file}`);
        ran++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  FAIL  ${file}: ${err.message}`);
        throw err;
      }
    }

    console.log(`\nMigrations complete: ${ran} applied, ${skipped} skipped`);
  } finally {
    await client.end();
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err.message || err.code || JSON.stringify(err));
  console.error('Full error:', err);
  process.exit(1);
});
