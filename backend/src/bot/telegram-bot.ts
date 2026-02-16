import TelegramBot from 'node-telegram-bot-api';
import { registerHandlers } from './handlers';
import { logger } from '../services/logger';
import { sendHTMLMessage } from './rate-limiter';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_SECRET_TOKEN = process.env.TELEGRAM_SECRET_TOKEN;
const NODE_ENV = process.env.NODE_ENV || 'development';
const BACKEND_URL = process.env.BACKEND_URL;

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

// Initialize bot based on environment
let bot: TelegramBot;

if (NODE_ENV === 'production' && BACKEND_URL && TELEGRAM_SECRET_TOKEN) {
  // Production: Use webhook mode
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

  // Set webhook
  const webhookUrl = `${BACKEND_URL}/webhook`;
  bot.setWebHook(webhookUrl, {
    secret_token: TELEGRAM_SECRET_TOKEN,
  } as any)
    .then(() => {
      logger.info('Webhook set successfully', { webhookUrl });
    })
    .catch((error: Error) => {
      logger.error('Failed to set webhook', { error });
    });
} else {
  // Development: Use polling mode
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
  logger.info('Bot started in polling mode (development)');
}

// Register all command handlers
registerHandlers(bot);

/**
 * Grant Telegram access to a user by unbanning them
 */
export async function grantTelegramAccess(
  userId: number,
  groupId: number
): Promise<void> {
  try {
    // Unban user if they were previously kicked
    await bot.unbanChatMember(groupId, userId, { only_if_banned: true });
    logger.info('Access granted to user', { userId, groupId });
  } catch (error: any) {
    // Ignore "user not banned" errors
    if (!error.message?.includes('not banned')) {
      logger.error('Error granting access', { userId, groupId, error: error.message });
    }
  }
}

/**
 * Kick a member from a group
 */
export async function kickMember(
  userId: number,
  groupId: number
): Promise<void> {
  try {
    await bot.banChatMember(groupId, userId);
    logger.info('Member kicked from group', { userId, groupId });
  } catch (error: any) {
    logger.error('Error kicking member', { userId, groupId, error: error.message });
    throw error;
  }
}

/**
 * Send a notification to a user
 */
export async function notifyUser(
  userId: number,
  message: string,
  options?: any
): Promise<void> {
  try {
    await sendHTMLMessage(bot, userId, message, options);
    logger.info('Notification sent to user', { userId });
  } catch (error: any) {
    // User might have blocked the bot or doesn't have a chat with it
    if (error.message?.includes('bot was blocked') ||
        error.message?.includes('user is deactivated') ||
        error.message?.includes('chat not found')) {
      logger.warn('Unable to send notification - user unreachable', { userId, reason: error.message });
    } else {
      logger.error('Error sending notification', { userId, error: error.message });
    }
  }
}

/**
 * Process incoming webhook update
 * This is called by the Express webhook endpoint
 */
export function processUpdate(update: any): void {
  try {
    bot.processUpdate(update);
    logger.debug('Webhook update processed', { updateId: update.update_id });
  } catch (error) {
    logger.error('Error processing webhook update', { error });
  }
}

/**
 * Test Telegram bot connection
 */
export async function testTelegramConnection(): Promise<boolean> {
  try {
    await bot.getMe();
    return true;
  } catch {
    return false;
  }
}

export { bot };
