import { describe, it, expect } from 'vitest';
import { calculateTier } from '../member-checker';
import type { Group } from '../../types';

const defaultGroup: Group = {
  id: 'test-group-id',
  telegram_group_id: -1001234567890,
  name: 'Test Group',
  bronze_threshold: 300,
  silver_threshold: 500,
  gold_threshold: 700,
  auto_kick_enabled: true,
  recheck_frequency: 'daily',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

describe('calculateTier', () => {
  it('returns gold when score >= gold_threshold', () => {
    expect(calculateTier(700, defaultGroup)).toBe('gold');
    expect(calculateTier(850, defaultGroup)).toBe('gold');
    expect(calculateTier(1000, defaultGroup)).toBe('gold');
  });

  it('returns silver when score >= silver_threshold and < gold_threshold', () => {
    expect(calculateTier(500, defaultGroup)).toBe('silver');
    expect(calculateTier(600, defaultGroup)).toBe('silver');
    expect(calculateTier(699, defaultGroup)).toBe('silver');
  });

  it('returns bronze when score >= bronze_threshold and < silver_threshold', () => {
    expect(calculateTier(300, defaultGroup)).toBe('bronze');
    expect(calculateTier(400, defaultGroup)).toBe('bronze');
    expect(calculateTier(499, defaultGroup)).toBe('bronze');
  });

  it('returns none when score < bronze_threshold', () => {
    expect(calculateTier(0, defaultGroup)).toBe('none');
    expect(calculateTier(100, defaultGroup)).toBe('none');
    expect(calculateTier(299, defaultGroup)).toBe('none');
  });

  it('handles exact boundary values', () => {
    expect(calculateTier(300, defaultGroup)).toBe('bronze');
    expect(calculateTier(500, defaultGroup)).toBe('silver');
    expect(calculateTier(700, defaultGroup)).toBe('gold');
  });

  it('works with custom thresholds', () => {
    const customGroup: Group = {
      ...defaultGroup,
      bronze_threshold: 100,
      silver_threshold: 200,
      gold_threshold: 400
    };

    expect(calculateTier(50, customGroup)).toBe('none');
    expect(calculateTier(100, customGroup)).toBe('bronze');
    expect(calculateTier(200, customGroup)).toBe('silver');
    expect(calculateTier(400, customGroup)).toBe('gold');
  });

  it('handles zero thresholds', () => {
    const zeroGroup: Group = {
      ...defaultGroup,
      bronze_threshold: 0,
      silver_threshold: 100,
      gold_threshold: 200
    };

    expect(calculateTier(0, zeroGroup)).toBe('bronze');
    expect(calculateTier(100, zeroGroup)).toBe('silver');
  });
});
