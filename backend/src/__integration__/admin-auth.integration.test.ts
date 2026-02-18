import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

// Mock external services before importing app
vi.mock('../services/redis', () => ({
  getFairScoreFromCache: vi.fn().mockResolvedValue(null),
  setFairScoreCache: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../bot/telegram-bot', () => ({
  grantTelegramAccess: vi.fn().mockResolvedValue(undefined),
  kickMember: vi.fn().mockResolvedValue(undefined),
  notifyUser: vi.fn().mockResolvedValue(undefined),
  testTelegramConnection: vi.fn().mockResolvedValue(true),
  bot: { processUpdate: vi.fn() },
}));

import supertest from 'supertest';
import { app } from '../index';
import {
  truncateAll,
  closeTestPool,
  createGroup,
  createAdmin,
  createGroupAdmin,
  createRegistrationToken,
  getTestPool,
} from './fixtures';

const request = supertest(app);

describe('Admin Auth Integration Tests', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  // ================================================================
  // LOGIN
  // ================================================================
  describe('POST /api/admin/login', () => {
    it('returns 200 with token and groups for valid credentials', async () => {
      const group = await createGroup({ name: 'Auth Test Group' });
      const admin = await createAdmin({ email: 'login@test.com' });
      await createGroupAdmin(group.id, admin.id);

      const res = await request.post('/api/admin/login').send({
        email: 'login@test.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.groups).toHaveLength(1);
      expect(res.body.groups[0].name).toBe('Auth Test Group');
      expect(res.body.groupId).toBe(group.id);
    });

    it('returns 401 for wrong password', async () => {
      await createAdmin({ email: 'wrong-pw@test.com' });

      const res = await request.post('/api/admin/login').send({
        email: 'wrong-pw@test.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid');
    });

    it('returns 401 for nonexistent email', async () => {
      const res = await request.post('/api/admin/login').send({
        email: 'nobody@test.com',
        password: 'password123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('updates last_login timestamp on successful login', async () => {
      const admin = await createAdmin({ email: 'timestamp@test.com' });
      const group = await createGroup();
      await createGroupAdmin(group.id, admin.id);

      // Verify last_login is initially null
      const pool = getTestPool();
      const before = await pool.query('SELECT last_login FROM admins WHERE id = $1', [admin.id]);
      expect(before.rows[0].last_login).toBeNull();

      await request.post('/api/admin/login').send({
        email: 'timestamp@test.com',
        password: 'password123',
      });

      const after = await pool.query('SELECT last_login FROM admins WHERE id = $1', [admin.id]);
      expect(after.rows[0].last_login).not.toBeNull();
    });
  });

  // ================================================================
  // REGISTER
  // ================================================================
  describe('POST /api/admin/register', () => {
    it('creates admin, links to group, marks token used with valid token', async () => {
      const group = await createGroup({ name: 'Register Group' });
      const regToken = await createRegistrationToken(group.id);

      const res = await request.post('/api/admin/register').send({
        token: regToken.token,
        name: 'New Admin',
        email: 'newadmin@test.com',
        password: 'securepass123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.groups).toHaveLength(1);
      expect(res.body.groups[0].name).toBe('Register Group');
      expect(res.body.isExisting).toBe(false);

      // Verify admin was created in DB
      const pool = getTestPool();
      const adminRow = await pool.query('SELECT * FROM admins WHERE email = $1', ['newadmin@test.com']);
      expect(adminRow.rows).toHaveLength(1);
      expect(adminRow.rows[0].name).toBe('New Admin');

      // Verify group_admin link
      const linkRow = await pool.query(
        'SELECT * FROM group_admins WHERE admin_id = $1 AND group_id = $2',
        [adminRow.rows[0].id, group.id]
      );
      expect(linkRow.rows).toHaveLength(1);

      // Verify token marked as used
      const tokenRow = await pool.query(
        'SELECT used_at FROM admin_registration_tokens WHERE token = $1',
        [regToken.token]
      );
      expect(tokenRow.rows[0].used_at).not.toBeNull();
    });

    it('links existing admin to new group when email already exists', async () => {
      const group1 = await createGroup({ name: 'Group 1' });
      const group2 = await createGroup({ name: 'Group 2' });
      const admin = await createAdmin({ email: 'existing@test.com' });
      await createGroupAdmin(group1.id, admin.id);

      const regToken = await createRegistrationToken(group2.id);

      const res = await request.post('/api/admin/register').send({
        token: regToken.token,
        name: 'Existing Admin',
        email: 'existing@test.com',
        password: 'securepass123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isExisting).toBe(true);
      expect(res.body.groups).toHaveLength(2);

      // Verify admin is linked to both groups
      const pool = getTestPool();
      const links = await pool.query(
        'SELECT * FROM group_admins WHERE admin_id = $1',
        [admin.id]
      );
      expect(links.rows).toHaveLength(2);
    });

    it('returns 400 for expired token', async () => {
      const group = await createGroup();
      const regToken = await createRegistrationToken(group.id, {
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      });

      const res = await request.post('/api/admin/register').send({
        token: regToken.token,
        name: 'Late Admin',
        email: 'late@test.com',
        password: 'securepass123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('expired');
    });

    it('returns 400 for already used token', async () => {
      const group = await createGroup();
      const regToken = await createRegistrationToken(group.id, {
        used_at: new Date().toISOString(),
      });

      const res = await request.post('/api/admin/register').send({
        token: regToken.token,
        name: 'Reuse Admin',
        email: 'reuse@test.com',
        password: 'securepass123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('used');
    });
  });
});
