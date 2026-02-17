import { describe, it, expect } from 'vitest';
import { getTTLForTier } from '../redis';

describe('getTTLForTier', () => {
  it('returns 6 hours (21600s) for gold-level scores (>= 700)', () => {
    expect(getTTLForTier(undefined, 700)).toBe(21600);
    expect(getTTLForTier(undefined, 850)).toBe(21600);
    expect(getTTLForTier(undefined, 1000)).toBe(21600);
  });

  it('returns 3 hours (10800s) for silver-level scores (>= 500, < 700)', () => {
    expect(getTTLForTier(undefined, 500)).toBe(10800);
    expect(getTTLForTier(undefined, 600)).toBe(10800);
    expect(getTTLForTier(undefined, 699)).toBe(10800);
  });

  it('returns 1 hour (3600s) for bronze/low scores (< 500)', () => {
    expect(getTTLForTier(undefined, 0)).toBe(3600);
    expect(getTTLForTier(undefined, 300)).toBe(3600);
    expect(getTTLForTier(undefined, 499)).toBe(3600);
  });

  it('returns 1 hour when score is undefined', () => {
    expect(getTTLForTier()).toBe(3600);
    expect(getTTLForTier('gold')).toBe(3600);
  });

  it('uses score over tier string for TTL calculation', () => {
    // Even if tier says "bronze", a high score gets gold TTL
    expect(getTTLForTier('bronze', 700)).toBe(21600);
  });
});
