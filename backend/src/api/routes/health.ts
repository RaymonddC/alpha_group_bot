import { Router } from 'express';
import { testDatabaseConnection } from '../../db/client';
import { testRedisConnection } from '../../services/redis';
import { logger } from '../../services/logger';
import { HealthResponse } from '../../types';

const router = Router();

// Note: Bot test function will be imported from bot/telegram-bot.ts
let testTelegramConnection: () => Promise<boolean>;

export function setBotFunctions(testBot: typeof testTelegramConnection): void {
  testTelegramConnection = testBot;
}

/**
 * GET /api/health
 * Health check endpoint for monitoring
 */
router.get('/health', async (_req, res) => {
  const timestamp = new Date().toISOString();

  try {
    // Test all services
    const [dbConnected, redisConnected, telegramConnected] = await Promise.all([
      testDatabaseConnection(),
      testRedisConnection(),
      testTelegramConnection ? testTelegramConnection() : Promise.resolve(true)
    ]);

    const allHealthy = dbConnected && redisConnected && telegramConnected;

    const response: HealthResponse = {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp,
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
        redis: redisConnected ? 'connected' : 'disconnected',
        telegram: telegramConnected ? 'connected' : 'disconnected'
      },
      version: '1.0.0'
    };

    logger.info('Health check', response);

    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Health check error:', error);

    const response: HealthResponse = {
      status: 'error',
      timestamp,
      services: {
        database: 'disconnected',
        redis: 'disconnected',
        telegram: 'disconnected'
      },
      version: '1.0.0'
    };

    res.status(503).json(response);
  }
});

export default router;
