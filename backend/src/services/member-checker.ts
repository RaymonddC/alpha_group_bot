import { supabase } from '../db/client';
import { logger } from './logger';
import { getFairScoreWithCache } from './fairscale';
import { RecheckSummary, Group } from '../types';

// Note: Bot functions will be imported from bot/telegram-bot.ts
// These are placeholders - actual implementation will be in bot-dev's files
let kickMember: (userId: number, groupId: number) => Promise<void>;
let notifyUser: (userId: number, message: string) => Promise<void>;

/**
 * Set bot functions (called from index.ts after bot initialization)
 */
export function setBotFunctions(kick: typeof kickMember, notify: typeof notifyUser): void {
  kickMember = kick;
  notifyUser = notify;
}

/**
 * Calculate tier based on score and thresholds
 */
export function calculateTier(score: number, group: Group): 'gold' | 'silver' | 'bronze' | 'none' {
  if (score >= group.gold_threshold) return 'gold';
  if (score >= group.silver_threshold) return 'silver';
  if (score >= group.bronze_threshold) return 'bronze';
  return 'none';
}

/**
 * Re-check all members and update tiers
 */
export async function recheckAllMembers(): Promise<RecheckSummary> {
  const startTime = Date.now();
  logger.info('Starting daily member re-check...');

  let total = 0;
  let checked = 0;
  let kicked = 0;
  let promoted = 0;
  let demoted = 0;
  let unchanged = 0;

  try {
    // Get all members with their groups
    const { data: members, error: fetchError } = await supabase
      .from('members')
      .select('*, groups(*)');

    if (fetchError) {
      logger.error('Error fetching members:', fetchError);
      throw fetchError;
    }

    if (!members || members.length === 0) {
      logger.info('No members to re-check');
      return {
        total: 0,
        checked: 0,
        kicked: 0,
        promoted: 0,
        demoted: 0,
        unchanged: 0,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }

    total = members.length;
    logger.info(`Re-checking ${total} members`);

    for (const member of members) {
      try {
        const group = member.groups as unknown as Group;
        const oldScore = member.fairscore;
        const oldTier = member.tier;

        // Get fresh FairScore
        const newScore = await getFairScoreWithCache(member.wallet_address);
        const newTier = calculateTier(newScore, group);

        // Update member in database
        await supabase
          .from('members')
          .update({
            fairscore: newScore,
            tier: newTier,
            last_checked: new Date().toISOString()
          })
          .eq('id', member.id);

        // Determine action
        let action: 'kicked' | 'promoted' | 'demoted' | 'checked' = 'checked';

        if (newTier === 'none' && group.auto_kick_enabled) {
          action = 'kicked';
        } else if (newTier !== oldTier) {
          if (newScore > oldScore) {
            action = 'promoted';
          } else {
            action = 'demoted';
          }
        }

        // Log activity
        await supabase.from('activity_log').insert({
          member_id: member.id,
          action,
          old_score: oldScore,
          new_score: newScore,
          old_tier: oldTier,
          new_tier: newTier,
          details: `Daily re-check: ${oldTier} → ${newTier}`
        });

        // Handle tier changes and notifications
        if (newTier === 'none' && group.auto_kick_enabled) {
          // Kick member
          if (kickMember && notifyUser) {
            await kickMember(member.telegram_id, group.telegram_group_id);
            await notifyUser(
              member.telegram_id,
              `❌ You were removed from ${group.name}.\n\n` +
              `Your FairScore dropped to ${newScore} (minimum: ${group.bronze_threshold}).\n\n` +
              `Build your on-chain reputation and rejoin!`
            );
          }
          kicked++;
          logger.info('Member kicked', {
            memberId: member.id,
            score: newScore,
            threshold: group.bronze_threshold
          });
        } else if (newTier !== oldTier && oldTier !== 'none') {
          // Tier changed (promoted or demoted)
          if (newScore > oldScore) {
            // Promoted
            if (notifyUser) {
              await notifyUser(
                member.telegram_id,
                `🎉 Congratulations!\n\n` +
                `You've been promoted to ${newTier.toUpperCase()} tier in ${group.name}!\n\n` +
                `Your FairScore: ${newScore} (was ${oldScore})\n\n` +
                `Keep building your reputation! 🚀`
              );
            }
            promoted++;
            logger.info('Member promoted', {
              memberId: member.id,
              oldTier,
              newTier,
              score: newScore
            });
          } else {
            // Demoted
            if (notifyUser) {
              await notifyUser(
                member.telegram_id,
                `⚠️ Tier Change\n\n` +
                `You've been moved to ${newTier.toUpperCase()} tier in ${group.name}.\n\n` +
                `Your FairScore: ${newScore} (was ${oldScore})\n\n` +
                `Focus on quality on-chain interactions to improve your score.`
              );
            }
            demoted++;
            logger.info('Member demoted', {
              memberId: member.id,
              oldTier,
              newTier,
              score: newScore
            });
          }
        } else {
          unchanged++;
        }

        checked++;
      } catch (error) {
        logger.error(`Error re-checking member ${member.id}:`, error);
      }
    }

    const executionTime = Date.now() - startTime;
    const summary: RecheckSummary = {
      total,
      checked,
      kicked,
      promoted,
      demoted,
      unchanged,
      executionTime,
      timestamp: new Date().toISOString()
    };

    logger.info('Daily re-check complete', summary);
    return summary;
  } catch (error) {
    logger.error('Daily re-check failed:', error);
    throw error;
  }
}

/**
 * Re-check a single member (for manual triggers)
 */
export async function recheckMember(memberId: string): Promise<void> {
  logger.info('Re-checking single member', { memberId });

  const { data: member, error: fetchError } = await supabase
    .from('members')
    .select('*, groups(*)')
    .eq('id', memberId)
    .single();

  if (fetchError || !member) {
    logger.error('Member not found', { memberId });
    throw new Error('Member not found');
  }

  const group = member.groups as unknown as Group;
  const oldScore = member.fairscore;
  const oldTier = member.tier;

  // Get fresh FairScore
  const newScore = await getFairScoreWithCache(member.wallet_address);
  const newTier = calculateTier(newScore, group);

  // Update member
  await supabase
    .from('members')
    .update({
      fairscore: newScore,
      tier: newTier,
      last_checked: new Date().toISOString()
    })
    .eq('id', memberId);

  // Log activity
  await supabase.from('activity_log').insert({
    member_id: memberId,
    action: 'checked',
    old_score: oldScore,
    new_score: newScore,
    old_tier: oldTier,
    new_tier: newTier,
    details: 'Manual re-check'
  });

  logger.info('Member re-check complete', {
    memberId,
    oldScore,
    newScore,
    oldTier,
    newTier
  });
}
