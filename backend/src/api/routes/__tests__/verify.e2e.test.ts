import { vi, describe, it, expect, beforeEach } from 'vitest';
import { chainable } from './e2e-helpers';

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

const mockGetFairScore = vi.fn().mockResolvedValue(750);

// Mock FairScale
vi.mock('../../../services/fairscale', () => ({
  getFairScoreWithCache: (...args: any[]) => mockGetFairScore(...args),
}));

const mockVerifySIWS = vi.fn().mockResolvedValue({ valid: true });

// Mock Solana verify
vi.mock('../../../services/solana-verify', () => ({
  verifySIWS: (...args: any[]) => mockVerifySIWS(...args),
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

const TEST_GROUP_ID = '550e8400-e29b-41d4-a716-446655440000';

const validVerifyBody = {
  telegramId: '123456789',
  publicKey: 'BKgzFVwNfpbvGPTtYxSJdfwE4qXWoGFCRFRWsFdTosHB',
  signature: Array(64).fill(0).map((_, i) => i % 256),
  message:
    'alpha-groups.vercel.app wants you to sign in with your Solana account:\nBKgzFVwNfpbvGPTtYxSJdfwE4qXWoGFCRFRWsFdTosHB\n\nSign in to Alpha Groups\n\nNonce: abc123xyz',
  groupId: TEST_GROUP_ID,
};

describe('Verify E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifySIWS.mockResolvedValue({ valid: true });
    mockGetFairScore.mockResolvedValue(750);
  });

  describe('POST /api/verify', () => {
    function setupVerifyMocks(score: number) {
      mockGetFairScore.mockResolvedValue(score);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return chainable({ data: null, error: null });
        }
        if (table === 'groups') {
          return chainable({
            data: {
              id: TEST_GROUP_ID,
              name: 'Test Group',
              telegram_group_id: -100123,
              bronze_threshold: 300,
              silver_threshold: 500,
              gold_threshold: 700,
            },
            error: null,
          });
        }
        if (table === 'members') {
          return chainable({ data: null, error: null });
        }
        return chainable();
      });
    }

    it('returns 200 with gold tier for high score', async () => {
      setupVerifyMocks(750);

      const res = await request(app)
        .post('/api/verify')
        .send(validVerifyBody);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.fairscore).toBe(750);
      expect(res.body.tier).toBe('gold');
    });

    it('returns score too low for low score', async () => {
      setupVerifyMocks(100);

      const res = await request(app)
        .post('/api/verify')
        .send(validVerifyBody);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.fairscore).toBe(100);
      expect(res.body.tier).toBe('none');
    });

    it('returns 400 for invalid signature', async () => {
      mockVerifySIWS.mockResolvedValue({ valid: false, error: 'Invalid signature' });

      mockFrom.mockImplementation(() => chainable());

      const res = await request(app)
        .post('/api/verify')
        .send(validVerifyBody);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing telegramId', async () => {
      const { telegramId: _, ...body } = validVerifyBody;

      const res = await request(app)
        .post('/api/verify')
        .send(body);

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing publicKey', async () => {
      const { publicKey: _, ...body } = validVerifyBody;

      const res = await request(app)
        .post('/api/verify')
        .send(body);

      expect(res.status).toBe(400);
    });
  });
});

describe('Health E2E', () => {
  it('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('services');
    expect(res.body.services.database).toBe('connected');
    expect(res.body.services.redis).toBe('connected');
  });
});

describe('Cron E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/cron/recheck-members returns 200 with valid secret', async () => {
    const res = await request(app)
      .post('/api/cron/recheck-members')
      .set('Authorization', 'Bearer test-cron-secret-for-vitest');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary).toBeDefined();
  });

  it('POST /api/cron/recheck-members returns 401 with wrong secret', async () => {
    const res = await request(app)
      .post('/api/cron/recheck-members')
      .set('Authorization', 'Bearer wrong-secret');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
