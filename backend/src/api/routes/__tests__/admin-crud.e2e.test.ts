import { vi, describe, it, expect, beforeEach } from 'vitest';
import { chainable, generateTestToken } from './e2e-helpers';

const TEST_GROUP_ID = '11111111-1111-1111-1111-111111111111';
const TEST_ADMIN_ID = 'test-admin-id';
const TEST_MEMBER_ID = '22222222-2222-2222-2222-222222222222';

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

const token = generateTestToken(TEST_ADMIN_ID);

beforeEach(() => {
  vi.clearAllMocks();
});

// --- GET /api/admin/settings ---
describe('GET /api/admin/settings', () => {
  it('returns group settings (200)', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'group_admins':
          return chainable({ data: { group_id: TEST_GROUP_ID }, error: null });
        case 'groups':
          return chainable({
            data: {
              id: TEST_GROUP_ID,
              name: 'Test Group',
              bronze_threshold: 300,
              silver_threshold: 500,
              gold_threshold: 700,
              auto_kick_enabled: false,
            },
            error: null,
          });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .get(`/api/admin/settings?groupId=${TEST_GROUP_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.groupName).toBe('Test Group');
    expect(res.body.bronzeThreshold).toBe(300);
    expect(res.body.silverThreshold).toBe(500);
    expect(res.body.goldThreshold).toBe(700);
  });

  it('returns 404 when admin has no group access', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'group_admins':
          return chainable({ data: null, error: null });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .get(`/api/admin/settings?groupId=${TEST_GROUP_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// --- POST /api/admin/settings ---
describe('POST /api/admin/settings', () => {
  it('updates thresholds (200)', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'group_admins':
          return chainable({ data: { group_id: TEST_GROUP_ID }, error: null });
        case 'groups':
          return chainable({ data: null, error: null });
        case 'activity_log':
          return chainable({ data: null, error: null });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .post('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        groupId: TEST_GROUP_ID,
        bronzeThreshold: 300,
        silverThreshold: 500,
        goldThreshold: 700,
        autoKickEnabled: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects invalid threshold order (400)', async () => {
    const res = await request(app)
      .post('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        groupId: TEST_GROUP_ID,
        bronzeThreshold: 500,
        silverThreshold: 300,
        goldThreshold: 700,
      });

    expect(res.status).toBe(400);
  });

  it('returns 403 when admin lacks group access', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'group_admins':
          return chainable({ data: null, error: null });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .post('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        groupId: TEST_GROUP_ID,
        bronzeThreshold: 300,
        silverThreshold: 500,
        goldThreshold: 700,
      });

    expect(res.status).toBe(403);
  });
});

// --- GET /api/admin/members ---
describe('GET /api/admin/members', () => {
  it('returns paginated member list (200)', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'group_admins':
          return chainable({ data: { group_id: TEST_GROUP_ID }, error: null });
        case 'members':
          return chainable({
            data: [
              { id: TEST_MEMBER_ID, telegram_username: 'user1', fairscore: 750, tier: 'gold' },
            ],
            error: null,
            count: 1,
          });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .get(`/api/admin/members?groupId=${TEST_GROUP_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.members).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });

  it('supports search filter', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'group_admins':
          return chainable({ data: { group_id: TEST_GROUP_ID }, error: null });
        case 'members':
          return chainable({ data: [], error: null, count: 0 });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .get(`/api/admin/members?groupId=${TEST_GROUP_ID}&search=testuser`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.members).toEqual([]);
  });

  it('returns 403 when admin lacks group access', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'group_admins':
          return chainable({ data: null, error: null });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .get(`/api/admin/members?groupId=${TEST_GROUP_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// --- POST /api/admin/kick ---
describe('POST /api/admin/kick', () => {
  it('kicks a member (200)', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'group_admins':
          return chainable({ data: { group_id: TEST_GROUP_ID }, error: null });
        case 'members':
          return chainable({
            data: {
              id: TEST_MEMBER_ID,
              telegram_id: 12345,
              fairscore: 250,
              groups: { telegram_group_id: -100123 },
            },
            error: null,
          });
        case 'activity_log':
          return chainable({ data: null, error: null });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .post('/api/admin/kick')
      .set('Authorization', `Bearer ${token}`)
      .send({ groupId: TEST_GROUP_ID, memberId: TEST_MEMBER_ID });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 403 when admin lacks group access', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'group_admins':
          return chainable({ data: null, error: null });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .post('/api/admin/kick')
      .set('Authorization', `Bearer ${token}`)
      .send({ groupId: TEST_GROUP_ID, memberId: TEST_MEMBER_ID });

    expect(res.status).toBe(403);
  });
});

// --- GET /api/admin/analytics ---
describe('GET /api/admin/analytics', () => {
  it('returns analytics data (200)', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'group_admins':
          return chainable({ data: { group_id: TEST_GROUP_ID }, error: null });
        case 'members':
          return chainable({
            data: [
              { id: 'm1', fairscore: 750, tier: 'gold', telegram_username: 'user1' },
              { id: 'm2', fairscore: 500, tier: 'silver', telegram_username: 'user2' },
            ],
            error: null,
          });
        case 'activity_log':
          return chainable({ data: [], error: null });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .get(`/api/admin/analytics?groupId=${TEST_GROUP_ID}&period=30d`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalMembers).toBe(2);
    expect(res.body.tierDistribution).toBeDefined();
    expect(res.body.scoreDistribution).toBeDefined();
  });

  it('returns 403 when admin lacks group access', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'group_admins':
          return chainable({ data: null, error: null });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .get(`/api/admin/analytics?groupId=${TEST_GROUP_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// --- GET /api/admin/activity-log ---
describe('GET /api/admin/activity-log', () => {
  it('returns log entries (200)', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'group_admins':
          return chainable({ data: { group_id: TEST_GROUP_ID }, error: null });
        case 'activity_log':
          return chainable({
            data: [
              {
                id: 'log-1',
                action: 'verified',
                action_source: 'system',
                admin_id: null,
                details: null,
                old_score: null,
                new_score: null,
                old_tier: null,
                new_tier: null,
                created_at: '2024-01-01T00:00:00Z',
              },
            ],
            error: null,
            count: 1,
          });
        case 'admins':
          return chainable({ data: [], error: null });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .get(`/api/admin/activity-log?groupId=${TEST_GROUP_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('supports action filter', async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'group_admins':
          return chainable({ data: { group_id: TEST_GROUP_ID }, error: null });
        case 'activity_log':
          return chainable({ data: [], error: null, count: 0 });
        case 'admins':
          return chainable({ data: [], error: null });
        default:
          return chainable();
      }
    });

    const res = await request(app)
      .get(`/api/admin/activity-log?groupId=${TEST_GROUP_ID}&action=settings_updated`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.logs).toEqual([]);
  });
});
