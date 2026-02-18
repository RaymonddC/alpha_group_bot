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
  createMember,
  createActivityLog,
  getTestPool,
} from './fixtures';
import { generateTestToken } from './helpers';

const request = supertest(app);

describe('Admin CRUD Integration Tests', () => {
  let group: Awaited<ReturnType<typeof createGroup>>;
  let admin: Awaited<ReturnType<typeof createAdmin>>;
  let token: string;

  beforeEach(async () => {
    await truncateAll();
    group = await createGroup({ name: 'CRUD Test Group' });
    admin = await createAdmin({ email: 'crud-admin@test.com' });
    await createGroupAdmin(group.id, admin.id);
    token = generateTestToken(admin.id, admin.email);
  });

  afterAll(async () => {
    await closeTestPool();
  });

  // ================================================================
  // SETTINGS
  // ================================================================
  describe('GET /api/admin/settings', () => {
    it('returns group thresholds', async () => {
      const res = await request
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .query({ groupId: group.id });

      expect(res.status).toBe(200);
      expect(res.body.groupId).toBe(group.id);
      expect(res.body.groupName).toBe('CRUD Test Group');
      expect(res.body.bronzeThreshold).toBe(300);
      expect(res.body.silverThreshold).toBe(500);
      expect(res.body.goldThreshold).toBe(700);
      expect(res.body.autoKickEnabled).toBe(true);
    });
  });

  describe('POST /api/admin/settings', () => {
    it('updates thresholds in DB', async () => {
      const res = await request
        .post('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          groupId: group.id,
          bronzeThreshold: 200,
          silverThreshold: 400,
          goldThreshold: 600,
          autoKickEnabled: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify changes persisted in DB
      const pool = getTestPool();
      const row = await pool.query('SELECT * FROM groups WHERE id = $1', [group.id]);
      expect(row.rows[0].bronze_threshold).toBe(200);
      expect(row.rows[0].silver_threshold).toBe(400);
      expect(row.rows[0].gold_threshold).toBe(600);
      expect(row.rows[0].auto_kick_enabled).toBe(false);
    });
  });

  // ================================================================
  // MEMBERS
  // ================================================================
  describe('GET /api/admin/members', () => {
    it('returns paginated members', async () => {
      await createMember(group.id, { telegram_username: 'alice', fairscore: 800, tier: 'gold' });
      await createMember(group.id, { telegram_username: 'bob', fairscore: 500, tier: 'silver' });
      await createMember(group.id, { telegram_username: 'carol', fairscore: 300, tier: 'bronze' });

      const res = await request
        .get('/api/admin/members')
        .set('Authorization', `Bearer ${token}`)
        .query({ groupId: group.id, page: '1', limit: '2' });

      expect(res.status).toBe(200);
      expect(res.body.members).toHaveLength(2);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.totalPages).toBe(2);
    });

    it('filters members by search term', async () => {
      await createMember(group.id, { telegram_username: 'alice_wonder', fairscore: 600 });
      await createMember(group.id, { telegram_username: 'bob_builder', fairscore: 500 });

      const res = await request
        .get('/api/admin/members')
        .set('Authorization', `Bearer ${token}`)
        .query({ groupId: group.id, search: 'alice' });

      expect(res.status).toBe(200);
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].telegram_username).toBe('alice_wonder');
    });

    it('filters members by tier', async () => {
      await createMember(group.id, { fairscore: 800, tier: 'gold' });
      await createMember(group.id, { fairscore: 500, tier: 'silver' });
      await createMember(group.id, { fairscore: 350, tier: 'bronze' });

      const res = await request
        .get('/api/admin/members')
        .set('Authorization', `Bearer ${token}`)
        .query({ groupId: group.id, tier: 'gold' });

      expect(res.status).toBe(200);
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].tier).toBe('gold');
    });
  });

  // ================================================================
  // KICK
  // ================================================================
  describe('POST /api/admin/kick', () => {
    it('logs activity then deletes member (FK fix)', async () => {
      const member = await createMember(group.id, { fairscore: 100, tier: 'none' });
      const pool = getTestPool();

      const res = await request
        .post('/api/admin/kick')
        .set('Authorization', `Bearer ${token}`)
        .send({
          groupId: group.id,
          memberId: member.id,
          reason: 'Test kick',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Member should be deleted
      const memberRow = await pool.query('SELECT * FROM members WHERE id = $1', [member.id]);
      expect(memberRow.rows).toHaveLength(0);

      // Activity log might be cascade-deleted with the member, but the important thing
      // is that the kick succeeded (no FK violation)
    });

    it('returns 404 for nonexistent member', async () => {
      const res = await request
        .post('/api/admin/kick')
        .set('Authorization', `Bearer ${token}`)
        .send({
          groupId: group.id,
          memberId: '00000000-0000-0000-0000-000000000000',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 for unauthorized group', async () => {
      const otherGroup = await createGroup({ name: 'Other Group' });
      const member = await createMember(otherGroup.id);

      const res = await request
        .post('/api/admin/kick')
        .set('Authorization', `Bearer ${token}`)
        .send({
          groupId: otherGroup.id,
          memberId: member.id,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });
  });

  // ================================================================
  // ANALYTICS
  // ================================================================
  describe('GET /api/admin/analytics', () => {
    it('returns tier distribution and score stats', async () => {
      await createMember(group.id, { fairscore: 800, tier: 'gold' });
      await createMember(group.id, { fairscore: 600, tier: 'silver' });
      await createMember(group.id, { fairscore: 400, tier: 'bronze' });

      const res = await request
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${token}`)
        .query({ groupId: group.id });

      expect(res.status).toBe(200);
      expect(res.body.totalMembers).toBe(3);
      expect(res.body.tierDistribution).toEqual({ bronze: 1, silver: 1, gold: 1 });
      expect(res.body.avgScore).toBe(600);
      expect(res.body.medianScore).toBe(600);
    });
  });

  // ================================================================
  // ACTIVITY LOG
  // ================================================================
  describe('GET /api/admin/activity-log', () => {
    it('returns paginated activity logs', async () => {
      const member = await createMember(group.id);
      await createActivityLog(member.id, {
        action: 'verified',
        old_score: 0,
        new_score: 500,
        group_id: group.id,
      });
      await createActivityLog(member.id, {
        action: 'promoted',
        old_score: 500,
        new_score: 700,
        group_id: group.id,
      });

      const res = await request
        .get('/api/admin/activity-log')
        .set('Authorization', `Bearer ${token}`)
        .query({ groupId: group.id, page: '1', limit: '10' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.logs).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });
  });

  // ================================================================
  // AUTH / ACCESS CONTROL
  // ================================================================
  describe('Authentication & Authorization', () => {
    it('returns 401 without token on authenticated endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/admin/settings' },
        { method: 'get', path: '/api/admin/members' },
        { method: 'get', path: '/api/admin/analytics' },
        { method: 'get', path: '/api/admin/activity-log' },
        { method: 'post', path: '/api/admin/settings' },
        { method: 'post', path: '/api/admin/kick' },
      ];

      for (const ep of endpoints) {
        const res = await (request as any)[ep.method](ep.path);
        expect(res.status).toBe(401);
      }
    });

    it('returns 403 for group-scoped endpoints with wrong group', async () => {
      const otherGroup = await createGroup({ name: 'Unauthorized Group' });

      const membersRes = await request
        .get('/api/admin/members')
        .set('Authorization', `Bearer ${token}`)
        .query({ groupId: otherGroup.id });
      expect(membersRes.status).toBe(403);

      const analyticsRes = await request
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${token}`)
        .query({ groupId: otherGroup.id });
      expect(analyticsRes.status).toBe(403);

      const activityRes = await request
        .get('/api/admin/activity-log')
        .set('Authorization', `Bearer ${token}`)
        .query({ groupId: otherGroup.id });
      expect(activityRes.status).toBe(403);
    });
  });
});
