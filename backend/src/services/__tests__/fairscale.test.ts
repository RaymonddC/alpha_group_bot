import { describe, it, expect } from 'vitest';
import { getCircuitBreakerStatus } from '../fairscale';

describe('getCircuitBreakerStatus', () => {
  it('starts in CLOSED state', () => {
    const status = getCircuitBreakerStatus();
    expect(status.state).toBe('CLOSED');
    expect(status.healthy).toBe(true);
  });

  it('reports healthy when not OPEN', () => {
    const status = getCircuitBreakerStatus();
    expect(status.healthy).toBe(status.state !== 'OPEN');
  });
});
