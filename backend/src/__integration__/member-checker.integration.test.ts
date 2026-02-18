process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/alpha_groups_test';

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

// Mock external services BEFORE importing the module under test
vi.mock('../services/redis', () => ({
  getFairScoreFromCache: vi.fn().mockResolvedValue(null),
  setFairScoreCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/fairscale', () => ({
  getFairScoreWithCache: vi.fn(),
}));

vi.mock('../bot/telegram-bot', () => ({
  grantTelegramAccess: vi.fn().mockResolvedValue(undefined),
  kickMember: vi.fn().mockResolvedValue(undefined),
  notifyUser: vi.fn().mockResolvedValue(undefined),
  testTelegramConnection: vi.fn().mockResolvedValue(true),
  bot: { processUpdate: vi.fn() },
}));

import { recheckAllMembers, setBotFunctions } from '../services/member-checker';
import { getFairScoreWithCache } from '../services/fairscale';
import {
  truncateAll,
  closeTestPool,
  createGroup,
  createMember,
  getTestPool,
} from './fixtures';

const mockKick = vi.fn().mockResolvedValue(undefined);
const mockNotify = vi.fn().mockResolvedValue(undefined);

describe('member-checker integration', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.clearAllMocks();
    setBotFunctions(mockKick, mockNotify);
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('recheckAllMembers with no members returns summary with zeroes', async () => {
    vi.mocked(getFairScoreWithCache).mockResolvedValue(0);

    const summary = await recheckAllMembers();

    expect(summary.total).toBe(0);
    expect(summary.checked).toBe(0);
    expect(summary.kicked).toBe(0);
    expect(summary.promoted).toBe(0);
    expect(summary.demoted).toBe(0);
    expect(summary.unchanged).toBe(0);
  });

  it('recheckAllMembers updates member scores in DB', async () => {
    const group = await createGroup();
    const member = await createMember(group.id, {
      fairscore: 500,
      tier: 'silver',
    });

    vi.mocked(getFairScoreWithCache).mockResolvedValue(650);

    await recheckAllMembers();

    const pool = getTestPool();
    const result = await pool.query('SELECT fairscore FROM members WHERE id = $1', [member.id]);
    expect(result.rows[0].fairscore).toBe(650);
  });

  it('recheckAllMembers promotes member when score increases past threshold', async () => {
    const group = await createGroup({
      bronze_threshold: 300,
      silver_threshold: 500,
      gold_threshold: 700,
    });
    const member = await createMember(group.id, {
      fairscore: 400,
      tier: 'bronze',
    });

    vi.mocked(getFairScoreWithCache).mockResolvedValue(600);

    const summary = await recheckAllMembers();

    expect(summary.promoted).toBe(1);

    const pool = getTestPool();
    const result = await pool.query('SELECT tier, fairscore FROM members WHERE id = $1', [member.id]);
    expect(result.rows[0].tier).toBe('silver');
    expect(result.rows[0].fairscore).toBe(600);

    // Verify notification was sent
    expect(mockNotify).toHaveBeenCalledWith(
      member.telegram_id,
      expect.stringContaining('promoted'),
    );
  });

  it('recheckAllMembers demotes member when score drops', async () => {
    const group = await createGroup({
      bronze_threshold: 300,
      silver_threshold: 500,
      gold_threshold: 700,
    });
    const member = await createMember(group.id, {
      fairscore: 600,
      tier: 'silver',
    });

    vi.mocked(getFairScoreWithCache).mockResolvedValue(400);

    const summary = await recheckAllMembers();

    expect(summary.demoted).toBe(1);

    const pool = getTestPool();
    const result = await pool.query('SELECT tier, fairscore FROM members WHERE id = $1', [member.id]);
    expect(result.rows[0].tier).toBe('bronze');
    expect(result.rows[0].fairscore).toBe(400);

    // Verify demotion notification
    expect(mockNotify).toHaveBeenCalledWith(
      member.telegram_id,
      expect.stringContaining('Tier Change'),
    );
  });

  it('recheckAllMembers kicks member when score drops below bronze with auto_kick_enabled', async () => {
    const group = await createGroup({
      bronze_threshold: 300,
      silver_threshold: 500,
      gold_threshold: 700,
      auto_kick_enabled: true,
    });
    const member = await createMember(group.id, {
      fairscore: 400,
      tier: 'bronze',
    });

    vi.mocked(getFairScoreWithCache).mockResolvedValue(100);

    const summary = await recheckAllMembers();

    expect(summary.kicked).toBe(1);

    // Verify kick and notification were called (BIGINT may come back as string or number)
    expect(mockKick).toHaveBeenCalledTimes(1);
    const kickArgs = mockKick.mock.calls[0];
    expect(Number(kickArgs[0])).toBe(Number(member.telegram_id));
    expect(Number(kickArgs[1])).toBe(Number(group.telegram_group_id));

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(Number(mockNotify.mock.calls[0][0])).toBe(Number(member.telegram_id));
    expect(mockNotify.mock.calls[0][1]).toContain('removed');
  });

  it('recheckAllMembers leaves unchanged members alone', async () => {
    const group = await createGroup({
      bronze_threshold: 300,
      silver_threshold: 500,
      gold_threshold: 700,
    });
    await createMember(group.id, {
      fairscore: 550,
      tier: 'silver',
    });

    // Return same-tier score (still silver: 500-699)
    vi.mocked(getFairScoreWithCache).mockResolvedValue(560);

    const summary = await recheckAllMembers();

    expect(summary.unchanged).toBe(1);
    expect(summary.promoted).toBe(0);
    expect(summary.demoted).toBe(0);
    expect(summary.kicked).toBe(0);
  });

  it('recheckAllMembers creates activity_log entries for each checked member', async () => {
    const group = await createGroup();
    const member1 = await createMember(group.id, {
      fairscore: 500,
      tier: 'silver',
    });
    const member2 = await createMember(group.id, {
      fairscore: 400,
      tier: 'bronze',
    });

    vi.mocked(getFairScoreWithCache).mockResolvedValue(500);

    await recheckAllMembers();

    const pool = getTestPool();
    const logs = await pool.query(
      'SELECT * FROM activity_log WHERE action_source = $1 ORDER BY created_at',
      ['cron'],
    );

    expect(logs.rows.length).toBe(2);

    const memberIds = logs.rows.map((r: any) => r.member_id);
    expect(memberIds).toContain(member1.id);
    expect(memberIds).toContain(member2.id);

    // All entries should have cron as source
    for (const row of logs.rows) {
      expect(row.action_source).toBe('cron');
      expect(row.new_score).toBe(500);
    }
  });
});
