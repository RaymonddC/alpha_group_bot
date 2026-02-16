import { sendHTMLMessage } from './rate-limiter';
import { logger } from '../services/logger';

/**
 * Send verification success notification
 */
export async function sendVerificationSuccess(
  bot: any,
  userId: number,
  fairscore: number,
  tier: string
): Promise<void> {
  const message = `
<b>✅ Verification Successful!</b>

Your wallet has been verified and you've been granted access to the group.

<b>Your FairScore:</b> ${fairscore} / 1000
<b>Your Tier:</b> ${tier.toUpperCase()}

Welcome to the community! 🎉
  `.trim();

  try {
    await sendHTMLMessage(bot, userId, message);
    logger.info('Verification success notification sent', { userId, fairscore, tier });
  } catch (error) {
    logger.error('Failed to send verification success notification', { userId, error });
  }
}

/**
 * Send verification failed notification
 */
export async function sendVerificationFailed(
  bot: any,
  userId: number,
  fairscore: number,
  required: number
): Promise<void> {
  const message = `
<b>❌ Verification Failed</b>

Your FairScore is below the minimum threshold for this group.

<b>Your FairScore:</b> ${fairscore} / 1000
<b>Required:</b> ${required}+

<b>What can you do?</b>
• Build your on-chain reputation through quality interactions
• Contribute to the Solana ecosystem
• Try again once your score improves

You can check your score at any time by verifying your wallet again.
  `.trim();

  try {
    await sendHTMLMessage(bot, userId, message);
    logger.info('Verification failed notification sent', { userId, fairscore, required });
  } catch (error) {
    logger.error('Failed to send verification failed notification', { userId, error });
  }
}

/**
 * Send tier promotion notification
 */
export async function sendTierPromotion(
  bot: any,
  userId: number,
  oldTier: string,
  newTier: string,
  score: number
): Promise<void> {
  const message = `
<b>🎉 Tier Promotion!</b>

Congratulations! Your on-chain reputation has improved.

<b>Previous Tier:</b> ${oldTier.toUpperCase()}
<b>New Tier:</b> ${newTier.toUpperCase()}
<b>Current FairScore:</b> ${score} / 1000

Keep up the great work! 🚀
  `.trim();

  try {
    await sendHTMLMessage(bot, userId, message);
    logger.info('Tier promotion notification sent', { userId, oldTier, newTier, score });
  } catch (error) {
    logger.error('Failed to send tier promotion notification', { userId, error });
  }
}

/**
 * Send tier demotion notification
 */
export async function sendTierDemotion(
  bot: any,
  userId: number,
  oldTier: string,
  newTier: string,
  score: number
): Promise<void> {
  const message = `
<b>⚠️ Tier Change</b>

Your reputation score has changed.

<b>Previous Tier:</b> ${oldTier.toUpperCase()}
<b>New Tier:</b> ${newTier.toUpperCase()}
<b>Current FairScore:</b> ${score} / 1000

<b>Tip:</b> Focus on quality on-chain interactions to improve your score.
  `.trim();

  try {
    await sendHTMLMessage(bot, userId, message);
    logger.info('Tier demotion notification sent', { userId, oldTier, newTier, score });
  } catch (error) {
    logger.error('Failed to send tier demotion notification', { userId, error });
  }
}

/**
 * Send kick warning notification
 */
export async function sendKickWarning(
  bot: any,
  userId: number,
  score: number,
  threshold: number
): Promise<void> {
  const message = `
<b>⚠️ Warning: Low FairScore</b>

Your reputation score is below the minimum threshold for this group.

<b>Your FairScore:</b> ${score} / 1000
<b>Minimum Required:</b> ${threshold}

<b>Action Required:</b>
If your score doesn't improve within 24 hours, you may be removed from the group.

Focus on building your on-chain reputation through quality interactions in the Solana ecosystem.
  `.trim();

  try {
    await sendHTMLMessage(bot, userId, message);
    logger.info('Kick warning notification sent', { userId, score, threshold });
  } catch (error) {
    logger.error('Failed to send kick warning notification', { userId, error });
  }
}

/**
 * Send kick notification
 */
export async function sendKickNotification(
  bot: any,
  userId: number,
  groupName: string,
  score: number,
  threshold: number
): Promise<void> {
  const message = `
<b>❌ Removed from Group</b>

You have been removed from <b>${groupName}</b>.

<b>Reason:</b> FairScore below minimum threshold

<b>Your FairScore:</b> ${score} / 1000
<b>Required:</b> ${threshold}+

<b>How to rejoin:</b>
1. Build your on-chain reputation through quality interactions
2. Improve your FairScore to ${threshold}+ or higher
3. Use /verify again to rejoin the group

We appreciate quality community members. Work on your reputation and come back! 💪
  `.trim();

  try {
    await sendHTMLMessage(bot, userId, message);
    logger.info('Kick notification sent', { userId, groupName, score, threshold });
  } catch (error) {
    logger.error('Failed to send kick notification', { userId, error });
  }
}
