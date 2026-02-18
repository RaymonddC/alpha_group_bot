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
} from './fixtures';
import { generateTestToken } from './helpers';

const request = supertest(app);

describe('Admin Analytics Integration Tests', () => {
  let group: Awaited<ReturnType<typeof createGroup>>;
  let token: string;

  beforeEach(async () => {
    await truncateAll();
    group = await createGroup({ name: 'Analytics Group' });
    const admin = await createAdmin({ email: 'analytics-admin@test.com' });
    await createGroupAdmin(group.id, admin.id);
    token = generateTestToken(admin.id, admin.email);
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('returns correct tier distribution counts', async () => {
    await createMember(group.id, { fairscore: 750, tier: 'gold' });
    await createMember(group.id, { fairscore: 720, tier: 'gold' });
    await createMember(group.id, { fairscore: 550, tier: 'silver' });
    await createMember(group.id, { fairscore: 510, tier: 'silver' });
    await createMember(group.id, { fairscore: 520, tier: 'silver' });
    await createMember(group.id, { fairscore: 350, tier: 'bronze' });

    const res = await request
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${token}`)
      .query({ groupId: group.id });

    expect(res.status).toBe(200);
    expect(res.body.tierDistribution).toEqual({
      gold: 2,
      silver: 3,
      bronze: 1,
    });
    expect(res.body.totalMembers).toBe(6);
  });

  it('calculates average and median scores correctly', async () => {
    // Scores: 100, 300, 500, 700, 900
    // Average: 500, Median (index 2 of sorted): 500
    await createMember(group.id, { fairscore: 100, tier: 'none' });
    await createMember(group.id, { fairscore: 300, tier: 'bronze' });
    await createMember(group.id, { fairscore: 500, tier: 'silver' });
    await createMember(group.id, { fairscore: 700, tier: 'gold' });
    await createMember(group.id, { fairscore: 900, tier: 'gold' });

    const res = await request
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${token}`)
      .query({ groupId: group.id });

    expect(res.status).toBe(200);
    expect(res.body.avgScore).toBe(500);
    expect(res.body.medianScore).toBe(500);
  });

  it('returns correct score bucket distribution', async () => {
    await createMember(group.id, { fairscore: 150, tier: 'none' });   // 0-200
    await createMember(group.id, { fairscore: 350, tier: 'bronze' }); // 200-400
    await createMember(group.id, { fairscore: 450, tier: 'bronze' }); // 400-600
    await createMember(group.id, { fairscore: 550, tier: 'silver' }); // 400-600
    await createMember(group.id, { fairscore: 650, tier: 'silver' }); // 600-800
    await createMember(group.id, { fairscore: 750, tier: 'gold' });   // 600-800
    await createMember(group.id, { fairscore: 850, tier: 'gold' });   // 800-1000

    const res = await request
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${token}`)
      .query({ groupId: group.id });

    expect(res.status).toBe(200);
    expect(res.body.scoreDistribution).toEqual([
      { range: '0-200', count: 1 },
      { range: '200-400', count: 1 },
      { range: '400-600', count: 2 },
      { range: '600-800', count: 2 },
      { range: '800-1000', count: 1 },
    ]);
  });

  it('returns top members sorted by score descending', async () => {
    await createMember(group.id, { telegram_username: 'low', fairscore: 300, tier: 'bronze' });
    await createMember(group.id, { telegram_username: 'mid', fairscore: 500, tier: 'silver' });
    await createMember(group.id, { telegram_username: 'high', fairscore: 900, tier: 'gold' });

    const res = await request
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${token}`)
      .query({ groupId: group.id });

    expect(res.status).toBe(200);
    expect(res.body.topMembers).toHaveLength(3);
    expect(res.body.topMembers[0].telegram_username).toBe('high');
    expect(res.body.topMembers[0].fairscore).toBe(900);
    expect(res.body.topMembers[1].telegram_username).toBe('mid');
    expect(res.body.topMembers[2].telegram_username).toBe('low');
  });

  it('returns zeroes for an empty group', async () => {
    const res = await request
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${token}`)
      .query({ groupId: group.id });

    expect(res.status).toBe(200);
    expect(res.body.totalMembers).toBe(0);
    expect(res.body.avgScore).toBe(0);
    expect(res.body.medianScore).toBe(0);
    expect(res.body.tierDistribution).toEqual({ bronze: 0, silver: 0, gold: 0 });
    expect(res.body.scoreDistribution).toEqual([
      { range: '0-200', count: 0 },
      { range: '200-400', count: 0 },
      { range: '400-600', count: 0 },
      { range: '600-800', count: 0 },
      { range: '800-1000', count: 0 },
    ]);
    expect(res.body.topMembers).toEqual([]);
  });
});
