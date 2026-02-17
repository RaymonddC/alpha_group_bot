import { Router } from 'express';
import { verifySIWS } from '../../services/solana-verify';
import { getFairScoreWithCache } from '../../services/fairscale';
import { supabase } from '../../db/client';
import { logger } from '../../services/logger';
import { validateRequest, VerifyRequestSchema } from '../middleware/validation';
import { asyncHandler } from '../middleware/error-handler';
import { VerifyRequest, VerifyResponse, ERROR_MESSAGES } from '../../types';

const router = Router();

// Note: Bot functions will be imported from bot/telegram-bot.ts
// These are placeholders - actual implementation will be in bot-dev's files
let grantTelegramAccess: (userId: number, groupId: number) => Promise<void>;
let notifyUser: (userId: number, message: string) => Promise<void>;

/**
 * Set bot functions (called from index.ts after bot initialization)
 */
export function setBotFunctions(
  grant: typeof grantTelegramAccess,
  notify: typeof notifyUser
): void {
  grantTelegramAccess = grant;
  notifyUser = notify;
}

/**
 * POST /api/verify
 * Verify Solana wallet signature and check FairScore
 */
router.post(
  '/verify',
  validateRequest(VerifyRequestSchema),
  asyncHandler(async (req, res) => {
    const { telegramId, publicKey, signature, message, groupId } = req.body as VerifyRequest;

    logger.info('Verification request', {
      telegramId,
      publicKey: publicKey.substring(0, 8) + '...'
    });

    try {
      // 1. Verify signature
      const { valid, error: verifyError } = await verifySIWS(
        publicKey,
        message,
        signature,
        telegramId
      );

      if (!valid) {
        logger.warn('Signature verification failed', { telegramId, error: verifyError });
        const response: VerifyResponse = {
          success: false,
          error: verifyError || ERROR_MESSAGES.INVALID_SIGNATURE
        };
        res.status(400).json(response);
        return;
      }

      // 2. Store verification in audit log
      await supabase.from('verifications').insert({
        telegram_id: telegramId,
        wallet_address: publicKey,
        signature: JSON.stringify(signature),
        message,
        nonce: message.match(/Nonce:\s*([^\n]+)/)?.[1] || 'unknown'
      });

      // 3. Get FairScore from FairScale API
      const fairscore = (await getFairScoreWithCache(publicKey)) ?? 0;

      logger.info('FairScore retrieved', { telegramId, fairscore });

      // 4. Determine tier based on group thresholds
      let groupQuery = supabase.from('groups').select('*');
      if (groupId) {
        groupQuery = groupQuery.eq('id', groupId);
      } else {
        groupQuery = groupQuery.limit(1);
      }
      const { data: group, error: groupError } = await groupQuery.single();

      if (groupError || !group) {
        logger.error('No group found', { error: groupError });
        const response: VerifyResponse = {
          success: false,
          error: ERROR_MESSAGES.DATABASE_ERROR
        };
        res.status(500).json(response);
        return;
      }

      let tier: 'gold' | 'silver' | 'bronze' | 'none' = 'none';
      if (fairscore >= group.gold_threshold) tier = 'gold';
      else if (fairscore >= group.silver_threshold) tier = 'silver';
      else if (fairscore >= group.bronze_threshold) tier = 'bronze';

      // 5. Store/update member
      const { error: upsertError } = await supabase
        .from('members')
        .upsert(
          {
            group_id: group.id,
            telegram_id: parseInt(telegramId),
            wallet_address: publicKey,
            fairscore,
            tier,
            last_checked: new Date().toISOString()
          },
          {
            onConflict: 'group_id,telegram_id'
          }
        );

      if (upsertError) {
        logger.error('Failed to upsert member', { error: upsertError });
        const response: VerifyResponse = {
          success: false,
          error: ERROR_MESSAGES.DATABASE_ERROR
        };
        res.status(500).json(response);
        return;
      }

      // 6. Grant or deny Telegram access
      if (tier !== 'none') {
        // Grant access
        if (grantTelegramAccess && notifyUser) {
          await grantTelegramAccess(
            parseInt(telegramId),
            group.telegram_group_id
          );
          await notifyUser(
            parseInt(telegramId),
            `✅ Verified! Your FairScore: ${fairscore}. Tier: ${tier.toUpperCase()}`
          );
        }

        logger.info('Access granted', { telegramId, tier, fairscore });

        const response: VerifyResponse = {
          success: true,
          fairscore,
          tier,
          message: "Wallet verified! You've been granted access to the group."
        };
        res.json(response);
      } else {
        // Deny access
        if (notifyUser) {
          await notifyUser(
            parseInt(telegramId),
            `❌ Your FairScore (${fairscore}) is below the minimum (${group.bronze_threshold})`
          );
        }

        logger.info('Access denied - score too low', {
          telegramId,
          fairscore,
          required: group.bronze_threshold
        });

        const response: VerifyResponse = {
          success: false,
          error: ERROR_MESSAGES.SCORE_TOO_LOW,
          fairscore,
          required: group.bronze_threshold,
          tier: 'none'
        };
        res.json(response);
      }
    } catch (error) {
      logger.error('Verification error:', error);
      const response: VerifyResponse = {
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR,
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  })
);

export default router;
