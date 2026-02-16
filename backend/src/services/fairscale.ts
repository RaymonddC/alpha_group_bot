import axios, { AxiosError } from 'axios';
import { logger } from './logger';
import { getFairScoreFromCache, setFairScoreCache } from './redis';
import { CircuitState } from '../types';

const FAIRSCALE_API_URL = process.env.FAIRSCALE_API_URL || 'https://api.fairscale.xyz';
const FAIRSCALE_API_KEY = process.env.FAIRSCALE_API_KEY;

/**
 * Circuit Breaker Pattern Implementation
 */
class CircuitBreaker {
  private failureCount = 0;
  private failureThreshold = 5;
  private timeout = 60000; // 60 seconds
  private state: CircuitState = 'CLOSED';
  private nextAttempt = Date.now();

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
      this.state = 'HALF_OPEN';
      logger.info('Circuit breaker transitioning to HALF_OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger.info('Circuit breaker CLOSED - service recovered');
    }
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      logger.error('Circuit breaker OPEN - too many failures', {
        failureCount: this.failureCount,
        nextAttempt: new Date(this.nextAttempt).toISOString()
      });
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

const fairscaleCircuitBreaker = new CircuitBreaker();

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 3
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && shouldRetry(error)) {
      const delay = Math.pow(2, 3 - retries) * 1000; // 2s, 4s, 8s
      logger.info(`Retrying after ${delay}ms (${retries} retries left)`);
      await sleep(delay);
      return retryWithBackoff(fn, retries - 1);
    }
    throw error;
  }
}

function shouldRetry(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    return (
      axiosError.code === 'ECONNABORTED' ||
      axiosError.response?.status === 429 ||
      (axiosError.response?.status ?? 0) >= 500
    );
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get FairScore from FairScale API with circuit breaker and retry
 */
export async function getFairScore(walletAddress: string): Promise<number> {
  try {
    return await fairscaleCircuitBreaker.execute(async () => {
      return await retryWithBackoff(async () => {
        const response = await axios.get(
          `${FAIRSCALE_API_URL}/fairScore`,
          {
            params: { wallet: walletAddress },
            headers: {
              'fairkey': FAIRSCALE_API_KEY || '',
            },
            timeout: 5000
          }
        );

        const score = response.data.fair_score || 0;
        logger.info('FairScale API success', {
          walletAddress: walletAddress.substring(0, 8) + '...',
          score
        });

        return score;
      });
    });
  } catch (error) {
    logger.error('FairScale API error', {
      walletAddress: walletAddress.substring(0, 8) + '...',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Try cache fallback
    const cached = await getFairScoreFromCache(walletAddress);
    if (cached !== null) {
      logger.warn('Using cached FairScore due to API error', {
        walletAddress: walletAddress.substring(0, 8) + '...',
        score: cached
      });
      return cached;
    }

    // Don't silently return 0 — that would unfairly deny access due to our error
    throw new Error('FairScale service unavailable. Please try again later.');
  }
}

/**
 * Get FairScore with cache integration
 */
export async function getFairScoreWithCache(
  walletAddress: string,
  tier?: string
): Promise<number> {
  // 1. Check cache first
  const cached = await getFairScoreFromCache(walletAddress);
  if (cached !== null) {
    return cached;
  }

  // 2. Fetch from API
  const score = await getFairScore(walletAddress);

  // 3. Store in cache
  await setFairScoreCache(walletAddress, score, tier);

  return score;
}

/**
 * Batch fetch FairScores (for daily re-checks)
 */
export async function batchGetFairScores(
  walletAddresses: string[]
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();

  // Process in batches of 10 to avoid overwhelming the API
  const batchSize = 10;
  for (let i = 0; i < walletAddresses.length; i += batchSize) {
    const batch = walletAddresses.slice(i, i + batchSize);
    const promises = batch.map(async (address) => {
      try {
        const score = await getFairScoreWithCache(address);
        scores.set(address, score);
      } catch (error) {
        logger.error('Batch fetch error', {
          address: address.substring(0, 8) + '...',
          error
        });
        scores.set(address, 0);
      }
    });

    await Promise.all(promises);

    // Small delay between batches
    if (i + batchSize < walletAddresses.length) {
      await sleep(1000);
    }
  }

  return scores;
}

/**
 * Get circuit breaker status (for health checks)
 */
export function getCircuitBreakerStatus(): {
  state: CircuitState;
  healthy: boolean;
} {
  const state = fairscaleCircuitBreaker.getState();
  return {
    state,
    healthy: state !== 'OPEN'
  };
}
