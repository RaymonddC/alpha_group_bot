import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const ADMIN_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
const TEST_DB = 'alpha_groups_test';

export async function setup() {
  // Connect to default postgres DB to create the test DB
  const adminPool = new Pool({ connectionString: ADMIN_URL });

  try {
    // Terminate existing connections to the test DB
    await adminPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${TEST_DB}' AND pid <> pg_backend_pid()
    `);

    // Drop and recreate
    await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    await adminPool.query(`CREATE DATABASE ${TEST_DB}`);
  } finally {
    await adminPool.end();
  }

  // Connect to the test DB and run migrations
  const testPool = new Pool({
    connectionString: `postgresql://postgres:postgres@localhost:5432/${TEST_DB}`,
  });

  try {
    const migrationsDir = path.resolve(__dirname, '../../migrations');

    // Run migrations in order, skip 005 (seed data)
    const migrationFiles = [
      '001_initial_schema.sql',
      '002_add_indexes.sql',
      '003_add_rls_policies.sql',
      '004_add_nonce_cleanup.sql',
      '006_admin_registration_tokens.sql',
      '007_admin_telegram_user_id.sql',
      '008_activity_log_admin_audit.sql',
    ];

    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await testPool.query(sql);
    }
  } finally {
    await testPool.end();
  }
}

export async function teardown() {
  const adminPool = new Pool({ connectionString: ADMIN_URL });

  try {
    // Terminate connections
    await adminPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${TEST_DB}' AND pid <> pg_backend_pid()
    `);

    await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  } finally {
    await adminPool.end();
  }
}
