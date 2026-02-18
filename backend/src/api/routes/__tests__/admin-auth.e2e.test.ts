import { vi, describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { chainable, generateTestToken, TEST_ADMIN_ID, TEST_GROUP_ID } from './e2e-helpers';

const mockFrom = vi.fn();

// Mock DB
vi.mock('../../../db/client', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
  testDatabaseConnection: vi.fn().mockResolvedValue(true),
}));

// Mock Redis
vi.mock('../../../services/redis', () => ({
  testRedisConnection: vi.fn().mockResolvedValue(true),
  getFairScoreFromCache: vi.fn().mockResolvedValue(null),
  setFairScoreCache: vi.fn(),
}));

// Mock FairScale
vi.mock('../../../services/fairscale', () => ({
  getFairScoreWithCache: vi.fn().mockResolvedValue(750),
}));

// Mock Solana verify
vi.mock('../../../services/solana-verify', () => ({
  verifySIWS: vi.fn().mockResolvedValue({ valid: true }),
}));

// Mock logger
vi.mock('../../../services/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock member-checker
vi.mock('../../../services/member-checker', () => ({
  recheckAllMembers: vi.fn().mockResolvedValue({ total: 10, checked: 10, kicked: 0 }),
  setBotFunctions: vi.fn(),
}));

// Mock bot
vi.mock('../../../bot/telegram-bot', () => ({
  bot: { processUpdate: vi.fn() },
  grantTelegramAccess: vi.fn(),
  kickMember: vi.fn(),
  notifyUser: vi.fn(),
  testTelegramConnection: vi.fn().mockResolvedValue(true),
}));

import request from 'supertest';
import { app } from '../../../index';

const bcryptHash = bcrypt.hashSync('testpass123', 10);

describe('Admin Auth E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/admin/login', () => {
    it('returns 200 with token for valid credentials', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'admins') {
          return chainable({
            data: { id: TEST_ADMIN_ID, email: 'test@example.com', password_hash: bcryptHash },
            error: null,
          });
        }
        if (table === 'group_admins') {
          return chainable({
            data: [{ group_id: TEST_GROUP_ID, groups: { id: TEST_GROUP_ID, name: 'Test Group' } }],
            error: null,
          });
        }
        if (table === 'members') {
          return chainable({ data: null, error: null, count: 5 });
        }
        return chainable();
      });

      const res = await request(app)
        .post('/api/admin/login')
        .send({ email: 'test@example.com', password: 'testpass123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.groups).toBeInstanceOf(Array);
      expect(res.body.groupId).toBe(TEST_GROUP_ID);
    });

    it('returns 401 for wrong password', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'admins') {
          return chainable({
            data: { id: TEST_ADMIN_ID, email: 'test@example.com', password_hash: bcryptHash },
            error: null,
          });
        }
        return chainable();
      });

      const res = await request(app)
        .post('/api/admin/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid');
    });

    it('returns 401 when admin not found', async () => {
      mockFrom.mockImplementation(() => {
        return chainable({ data: null, error: { message: 'not found' } });
      });

      const res = await request(app)
        .post('/api/admin/login')
        .send({ email: 'nobody@example.com', password: 'testpass123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ email: 'not-an-email', password: 'testpass123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/admin/groups', () => {
    it('returns 200 with groups for valid token', async () => {
      const token = generateTestToken();

      mockFrom.mockImplementation((table: string) => {
        if (table === 'group_admins') {
          return chainable({
            data: [{ group_id: TEST_GROUP_ID, groups: { id: TEST_GROUP_ID, name: 'Test Group' } }],
            error: null,
          });
        }
        if (table === 'members') {
          return chainable({ data: null, error: null, count: 3 });
        }
        return chainable();
      });

      const res = await request(app)
        .get('/api/admin/groups')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.groups).toBeInstanceOf(Array);
      expect(res.body.groups[0]).toHaveProperty('id', TEST_GROUP_ID);
      expect(res.body.groups[0]).toHaveProperty('name', 'Test Group');
      expect(res.body.groups[0]).toHaveProperty('member_count');
    });

    it('returns 401 without auth header', async () => {
      const res = await request(app).get('/api/admin/groups');

      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/admin/groups')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(res.status).toBe(401);
    });
  });
});
