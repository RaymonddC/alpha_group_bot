import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

const { mockGetFairScoreWithCache, mockVerifySIWS, mockParseSIWSMessage } = vi.hoisted(() => ({
  mockGetFairScoreWithCache: vi.fn().mockResolvedValue(500),
  mockVerifySIWS: vi.fn().mockResolvedValue({ valid: true }),
  mockParseSIWSMessage: vi.fn().mockReturnValue({ nonce: 'test-nonce' }),
}));

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
vi.mock('../services/fairscale', () => ({
  getFairScoreWithCache: mockGetFairScoreWithCache,
}));
vi.mock('../services/solana-verify', () => ({
  verifySIWS: mockVerifySIWS,
  parseSIWSMessage: mockParseSIWSMessage,
}));

import supertest from 'supertest';
import { app } from '../index';
import {
  truncateAll,
  closeTestPool,
  createGroup,
  createMember,
  getTestPool,
} from './fixtures';

const request = supertest(app);

// Build a valid verify request body
function buildVerifyBody(overrides: Record<string, unknown> = {}) {
  return {
    telegramId: '123456789',
    publicKey: 'So1anaWa11etAddrForTestingXXXXXXXXXXXX',
    signature: Array.from({ length: 64 }, (_, i) => i % 256),
    message: 'alpha-groups.app wants you to sign in with your Solana account:\nSo1anaWa11etAddrForTestingXXXXXXXXXXXX\n\nSign in to Alpha Groups\n\nNonce: test-nonce-abc123\nIssued At: 2026-02-18T00:00:00.000Z',
    ...overrides,
  };
}

describe('Verify Flow Integration Tests', () => {
  let group: Awaited<ReturnType<typeof createGroup>>;

  beforeEach(async () => {
    await truncateAll();
    group = await createGroup({
      name: 'Verify Test Group',
      bronze_threshold: 300,
      silver_threshold: 500,
      gold_threshold: 700,
    });
    // Reset mocks
    mockGetFairScoreWithCache.mockResolvedValue(500);
    mockVerifySIWS.mockResolvedValue({ valid: true });
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('creates a member in DB with correct tier on verify', async () => {
    mockGetFairScoreWithCache.mockResolvedValue(600);

    const res = await request
      .post('/api/verify')
      .send(buildVerifyBody({ groupId: group.id }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tier).toBe('silver');
    expect(res.body.fairscore).toBe(600);

    // Verify member in DB
    const pool = getTestPool();
    const row = await pool.query(
      'SELECT * FROM members WHERE group_id = $1 AND telegram_id = $2',
      [group.id, 123456789]
    );
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].fairscore).toBe(600);
    expect(row.rows[0].tier).toBe('silver');
  });

  it('upserts existing member with updated score/tier', async () => {
    // First create a member with bronze tier
    await createMember(group.id, {
      telegram_id: 123456789,
      wallet_address: 'So1anaWa11etAddrForTestingXXXXXXXXXXXX',
      fairscore: 350,
      tier: 'bronze',
    });

    // Now verify again with higher score
    mockGetFairScoreWithCache.mockResolvedValue(750);

    const res = await request
      .post('/api/verify')
      .send(buildVerifyBody({ groupId: group.id }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tier).toBe('gold');

    // Verify DB was updated (upsert)
    const pool = getTestPool();
    const row = await pool.query(
      'SELECT * FROM members WHERE group_id = $1 AND telegram_id = $2',
      [group.id, 123456789]
    );
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].fairscore).toBe(750);
    expect(row.rows[0].tier).toBe('gold');
  });

  it('creates a verification audit record', async () => {
    mockGetFairScoreWithCache.mockResolvedValue(500);

    await request.post('/api/verify').send(buildVerifyBody({ groupId: group.id }));

    const pool = getTestPool();
    const row = await pool.query(
      'SELECT * FROM verifications WHERE telegram_id = $1',
      [123456789]
    );
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].wallet_address).toBe('So1anaWa11etAddrForTestingXXXXXXXXXXXX');
    expect(row.rows[0].nonce).toBeDefined();
  });

  it('assigns correct tiers based on score thresholds', async () => {
    const pool = getTestPool();

    const testCases = [
      { score: 750, expectedTier: 'gold', telegramId: '111' },
      { score: 550, expectedTier: 'silver', telegramId: '222' },
      { score: 350, expectedTier: 'bronze', telegramId: '333' },
      { score: 100, expectedTier: 'none', telegramId: '444' },
    ];

    for (const tc of testCases) {
      mockGetFairScoreWithCache.mockResolvedValue(tc.score);

      const res = await request
        .post('/api/verify')
        .send(buildVerifyBody({
          groupId: group.id,
          telegramId: tc.telegramId,
        }));

      expect(res.status).toBe(200);
      expect(res.body.tier).toBe(tc.expectedTier);

      // Verify in DB
      const row = await pool.query(
        'SELECT tier FROM members WHERE group_id = $1 AND telegram_id = $2',
        [group.id, parseInt(tc.telegramId)]
      );
      expect(row.rows).toHaveLength(1);
      expect(row.rows[0].tier).toBe(tc.expectedTier);
    }
  });

  it('uses mocked fairscale for controllable scores', async () => {
    mockGetFairScoreWithCache.mockResolvedValue(999);

    const res = await request
      .post('/api/verify')
      .send(buildVerifyBody({ groupId: group.id }));

    expect(res.status).toBe(200);
    expect(res.body.fairscore).toBe(999);
    expect(res.body.tier).toBe('gold');
    expect(mockGetFairScoreWithCache).toHaveBeenCalled();
  });

  it('uses mocked solana-verify to always return valid', async () => {
    mockVerifySIWS.mockResolvedValue({ valid: true });
    mockGetFairScoreWithCache.mockResolvedValue(500);

    const res = await request
      .post('/api/verify')
      .send(buildVerifyBody({ groupId: group.id }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockVerifySIWS).toHaveBeenCalled();

    // Now test invalid signature
    mockVerifySIWS.mockResolvedValue({ valid: false, error: 'Bad signature' });

    const res2 = await request
      .post('/api/verify')
      .send(buildVerifyBody({
        groupId: group.id,
        telegramId: '999999',
      }));

    expect(res2.status).toBe(400);
    expect(res2.body.success).toBe(false);
  });
});
