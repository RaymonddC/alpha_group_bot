import { Router } from 'express';
import { recheckAllMembers } from '../../services/member-checker';
import { logger } from '../../services/logger';
import { asyncHandler } from '../middleware/error-handler';
import { ERROR_MESSAGES } from '../../types';

const router = Router();

const CRON_SECRET = process.env.CRON_SECRET || 'change_this_in_production';

/**
 * POST /api/cron/recheck-members
 * Trigger daily member re-check (called by GitHub Actions)
 */
router.post(
  '/recheck-members',
  asyncHandler(async (req, res) => {
    // Verify CRON_SECRET
    const authHeader = req.headers.authorization;

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      logger.warn('Unauthorized cron attempt', {
        ip: req.ip,
        headers: req.headers
      });
      res.status(401).json({
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED
      });
      return;
    }

    logger.info('Starting scheduled member re-check');

    try {
      const summary = await recheckAllMembers();

      logger.info('Scheduled re-check complete', summary);

      res.json({
        success: true,
        summary
      });
    } catch (error) {
      logger.error('Cron re-check failed:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

export default router;
