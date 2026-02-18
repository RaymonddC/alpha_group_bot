import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

let pool: Pool;

export function getTestPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/alpha_groups_test',
    });
  }
  return pool;
}

export async function closeTestPool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}

export async function truncateAll(): Promise<void> {
  const p = getTestPool();
  await p.query(`
    TRUNCATE
      activity_log,
      used_nonces,
      verifications,
      group_admins,
      admin_registration_tokens,
      members,
      admins,
      groups
    CASCADE
  `);
}

// ============================================================================
// Factory functions
// ============================================================================

let counter = 0;
function nextId(): number {
  return ++counter;
}

export interface CreatedGroup {
  id: string;
  telegram_group_id: number;
  name: string;
  bronze_threshold: number;
  silver_threshold: number;
  gold_threshold: number;
  auto_kick_enabled: boolean;
}

export async function createGroup(overrides: Partial<Record<string, unknown>> = {}): Promise<CreatedGroup> {
  const p = getTestPool();
  const n = nextId();
  const defaults = {
    telegram_group_id: -1000000000 - n,
    name: `Test Group ${n}`,
    bronze_threshold: 300,
    silver_threshold: 500,
    gold_threshold: 700,
    auto_kick_enabled: true,
    recheck_frequency: 'daily',
  };
  const data = { ...defaults, ...overrides };
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const result = await p.query(
    `INSERT INTO groups (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return result.rows[0];
}

export interface CreatedMember {
  id: string;
  group_id: string;
  telegram_id: number;
  telegram_username: string;
  wallet_address: string;
  fairscore: number;
  tier: string;
}

export async function createMember(
  groupId: string,
  overrides: Partial<Record<string, unknown>> = {}
): Promise<CreatedMember> {
  const p = getTestPool();
  const n = nextId();
  const defaults = {
    group_id: groupId,
    telegram_id: 100000 + n,
    telegram_username: `user_${n}`,
    wallet_address: `So1anaWa11etAddr${n.toString().padStart(20, '0')}`,
    fairscore: 500,
    tier: 'silver',
    last_checked: new Date().toISOString(),
  };
  const data = { ...defaults, ...overrides };
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const result = await p.query(
    `INSERT INTO members (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return result.rows[0];
}

export interface CreatedAdmin {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  telegram_user_id?: number;
}

export async function createAdmin(overrides: Partial<Record<string, unknown>> = {}): Promise<CreatedAdmin> {
  const p = getTestPool();
  const n = nextId();
  const defaults = {
    email: `admin${n}@test.com`,
    password_hash: await bcrypt.hash('password123', 4), // low rounds for speed
    name: `Admin ${n}`,
  };
  const data = { ...defaults, ...overrides };
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const result = await p.query(
    `INSERT INTO admins (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function createGroupAdmin(
  groupId: string,
  adminId: string,
  role = 'admin'
): Promise<void> {
  const p = getTestPool();
  await p.query(
    `INSERT INTO group_admins (group_id, admin_id, role) VALUES ($1, $2, $3)`,
    [groupId, adminId, role]
  );
}

export async function createRegistrationToken(
  groupId: string,
  overrides: Partial<Record<string, unknown>> = {}
): Promise<Record<string, unknown>> {
  const p = getTestPool();
  const n = nextId();
  const token = 'a'.repeat(64 - String(n).length) + String(n);
  const defaults = {
    token,
    telegram_user_id: 200000 + n,
    telegram_username: `tg_user_${n}`,
    group_id: groupId,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
  const data = { ...defaults, ...overrides };
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const result = await p.query(
    `INSERT INTO admin_registration_tokens (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function createActivityLog(
  memberId: string,
  overrides: Partial<Record<string, unknown>> = {}
): Promise<Record<string, unknown>> {
  const p = getTestPool();
  const defaults = {
    member_id: memberId,
    action: 'checked',
    old_score: 400,
    new_score: 500,
  };
  const data = { ...defaults, ...overrides };
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const result = await p.query(
    `INSERT INTO activity_log (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return result.rows[0];
}
