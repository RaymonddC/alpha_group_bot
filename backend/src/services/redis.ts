import Redis from 'ioredis';
import { logger } from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

// Cache TTL based on tier (in seconds)
export function getTTLForTier(_tier?: string, score?: number): number {
  if (score && score >= 700) return 6 * 3600; // 6 hours (gold tier)
  if (score && score >= 500) return 3 * 3600; // 3 hours (silver tier)
  return 1 * 3600; // 1 hour (bronze/new users)
}

// Cache-aside pattern helper for FairScore
export async function getFairScoreFromCache(walletAddress: string): Promise<number | null> {
  try {
    const cacheKey = `fairscore:${walletAddress}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const data = JSON.parse(cached);
      logger.info('FairScore cache hit', { walletAddress: walletAddress.substring(0, 8) + '...' });
      return data.score;
    }

    return null;
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
}

export async function setFairScoreCache(
  walletAddress: string,
  score: number,
  tier?: string
): Promise<void> {
  try {
    const cacheKey = `fairscore:${walletAddress}`;
    const ttl = getTTLForTier(tier, score);
    const data = JSON.stringify({
      score,
      tier,
      cached_at: Date.now()
    });

    await redis.setex(cacheKey, ttl, data);
    logger.info('FairScore cached', {
      walletAddress: walletAddress.substring(0, 8) + '...',
      score,
      ttl
    });
  } catch (error) {
    logger.error('Redis set error:', error);
  }
}

export async function invalidateFairScoreCache(walletAddress: string): Promise<void> {
  try {
    const cacheKey = `fairscore:${walletAddress}`;
    await redis.del(cacheKey);
    logger.info('FairScore cache invalidated', {
      walletAddress: walletAddress.substring(0, 8) + '...'
    });
  } catch (error) {
    logger.error('Redis delete error:', error);
  }
}

// Test Redis connection
export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
