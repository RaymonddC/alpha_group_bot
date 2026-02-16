import PQueue from 'p-queue';
import { logger } from '../services/logger';

// Individual chat queue: 1 message per second
const individualChatQueue = new PQueue({
  interval: 1000,
  intervalCap: 1,
});

// Group chat queue: 20 messages per minute
const groupChatQueue = new PQueue({
  interval: 60000,
  intervalCap: 20,
});

/**
 * Delays execution for the specified time
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends a message safely with rate limiting and retry on 429
 */
export async function sendMessageSafe(
  bot: any,
  chatId: number,
  message: string,
  options?: any
): Promise<void> {
  // Determine if this is a group chat (negative chat IDs are groups)
  const isGroup = chatId < 0;
  const queue = isGroup ? groupChatQueue : individualChatQueue;

  return queue.add(async () => {
    try {
      await bot.sendMessage(chatId, message, options);
      logger.info('Message sent successfully', { chatId, isGroup });
    } catch (error: any) {
      // Handle rate limiting (429 Too Many Requests)
      if (error.response?.statusCode === 429) {
        const retryAfter = error.response.parameters?.retry_after || 30;
        logger.warn('Rate limit hit, retrying', { chatId, retryAfter });

        await sleep(retryAfter * 1000);

        // Retry the message
        try {
          await bot.sendMessage(chatId, message, options);
          logger.info('Message sent after retry', { chatId });
        } catch (retryError) {
          logger.error('Failed to send message after retry', {
            chatId,
            error: retryError
          });
          throw retryError;
        }
      } else {
        logger.error('Error sending message', { chatId, error: error.message });
        throw error;
      }
    }
  });
}

/**
 * Sends a message with HTML parse mode
 */
export async function sendHTMLMessage(
  bot: any,
  chatId: number,
  message: string,
  options?: any
): Promise<void> {
  return sendMessageSafe(bot, chatId, message, {
    parse_mode: 'HTML',
    ...options,
  });
}

/**
 * Sends a message with Markdown parse mode
 */
export async function sendMarkdownMessage(
  bot: any,
  chatId: number,
  message: string,
  options?: any
): Promise<void> {
  return sendMessageSafe(bot, chatId, message, {
    parse_mode: 'Markdown',
    ...options,
  });
}
