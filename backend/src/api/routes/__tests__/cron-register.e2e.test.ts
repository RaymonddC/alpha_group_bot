import { vi, describe, it, expect, beforeEach } from 'vitest';
import { chainable } from './e2e-helpers';

const TEST_GROUP_ID = '11111111-1111-1111-1111-111111111111';
const TEST_REG_TOKEN = 'a'.repeat(64);

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

import request from 'supertest';
import { app } from '../../../index';

beforeEach(() => {
  vi.clearAllMocks();
});

// --- POST /api/cron/recheck-members ---
describe('POST /api/cron/recheck-members', () => {
  it('returns summary with valid CRON_SECRET (200)', async () => {
    const res = await request(app)
      .post('/api/cron/recheck-members')
      .set('Authorization', 'Bearer test-cron-secret-for-vitest');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary).toEqual({ total: 10, checked: 10, kicked: 0 });
  });

  it('rejects wrong secret (401)', async () => {
    const res = await request(app)
      .post('/api/cron/recheck-members')
      .set('Authorization', 'Bearer wrong-secret');

    expect(res.status).toBe(401);
  });
});

// --- GET /api/admin/register/validate ---
describe('GET /api/admin/register/validate', () => {
  it('returns valid for a valid token (200)', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'admin_registration_tokens':
          return chainable({
            data: {
              id: 'tok-1',
              token: TEST_REG_TOKEN,
              group_id: TEST_GROUP_ID,
              telegram_username: 'admin_user',
              used_at: null,
              expires_at: futureDate,
            },
            error: null,
          });
        case 'groups':
          return chainable({
            data: { name: 'Test Group' },
            error: null,
          });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .get(`/api/admin/register/validate?token=${TEST_REG_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.groupName).toBe('Test Group');
  });

  it('rejects missing token (400)', async () => {
    const res = await request(app)
      .get('/api/admin/register/validate');

    expect(res.status).toBe(400);
    expect(res.body.valid).toBe(false);
  });

  it('rejects already-used token (400)', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'admin_registration_tokens':
          return chainable({
            data: {
              id: 'tok-1',
              token: TEST_REG_TOKEN,
              group_id: TEST_GROUP_ID,
              used_at: '2024-01-01T00:00:00Z',
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            },
            error: null,
          });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .get(`/api/admin/register/validate?token=${TEST_REG_TOKEN}`);

    expect(res.status).toBe(400);
    expect(res.body.valid).toBe(false);
  });

  it('rejects invalid/not-found token (404)', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'admin_registration_tokens':
          return chainable({ data: null, error: { message: 'not found' } });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .get(`/api/admin/register/validate?token=${TEST_REG_TOKEN}`);

    expect(res.status).toBe(404);
  });
});

// --- POST /api/admin/register ---
describe('POST /api/admin/register', () => {
  it('creates a new admin (200)', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const newAdminId = '33333333-3333-3333-3333-333333333333';

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'admin_registration_tokens':
          return chainable({
            data: {
              id: 'tok-1',
              token: TEST_REG_TOKEN,
              group_id: TEST_GROUP_ID,
              telegram_user_id: 12345,
              used_at: null,
              expires_at: futureDate,
            },
            error: null,
          });
        case 'admins':
          return chainable({
            data: { id: newAdminId, email: 'new@example.com', name: 'New Admin' },
            error: null,
          });
        case 'group_admins':
          return chainable({
            data: [
              {
                group_id: TEST_GROUP_ID,
                groups: { id: TEST_GROUP_ID, name: 'Test Group' },
              },
            ],
            error: null,
          });
        case 'members':
          return chainable({ data: null, error: null, count: 5 });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .post('/api/admin/register')
      .send({
        token: TEST_REG_TOKEN,
        name: 'New Admin',
        email: 'new@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.groupId).toBe(TEST_GROUP_ID);
  });

  it('rejects already-used token (400)', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'admin_registration_tokens':
          return chainable({
            data: {
              id: 'tok-1',
              token: TEST_REG_TOKEN,
              group_id: TEST_GROUP_ID,
              used_at: '2024-01-01T00:00:00Z',
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            },
            error: null,
          });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .post('/api/admin/register')
      .send({
        token: TEST_REG_TOKEN,
        name: 'New Admin',
        email: 'new@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects invalid token format (400)', async () => {
    const res = await request(app)
      .post('/api/admin/register')
      .send({
        token: 'short',
        name: 'New Admin',
        email: 'new@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(400);
  });
});
