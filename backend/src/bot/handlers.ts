import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';
import { supabase } from '../db/client';
import { logger } from '../services/logger';
import { sendHTMLMessage } from './rate-limiter';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Handle /start command
 */
export async function handleStart(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  const message = `
<b>👋 Welcome to Alpha Groups!</b>

I help manage reputation-gated communities using on-chain credentials powered by FairScale.

<b>How it works:</b>
1️⃣ Use /verify to connect your Solana wallet
2️⃣ I check your FairScore (0-1000 reputation rating)
3️⃣ If you meet the threshold, you get access!

<b>Why FairScore?</b>
• Based on your on-chain activity
• Can't be faked or gamed easily
• Changes over time as you build reputation

<b>Commands:</b>
/verify - Verify your wallet and join
/status - Check your current status
/admin - Set up admin dashboard (group admins)
/help - Get help and support

Ready to get started? Use /verify! 🚀
  `.trim();

  try {
    await sendHTMLMessage(bot, chatId, message);
    logger.info('/start command handled', { userId, chatId });
  } catch (error) {
    logger.error('Failed to handle /start command', { userId, chatId, error });
  }
}

/**
 * Handle /verify command
 */
export async function handleVerify(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    await sendHTMLMessage(bot, chatId, '❌ Unable to identify user. Please try again.');
    return;
  }

  if (msg.chat.type === 'private') {
    await sendHTMLMessage(bot, chatId, 'Use /verify in a group chat to get your verification link.');
    return;
  }

  // Look up group to include gid in URL
  const { data: group } = await supabase
    .from('groups')
    .select('id')
    .eq('telegram_group_id', chatId)
    .single();

  let verificationUrl = `${FRONTEND_URL}/verify?tid=${userId}`;
  if (group) {
    verificationUrl += `&gid=${group.id}`;
  }

  const isLocalDev = FRONTEND_URL.includes('localhost');

  const message = `
<b>🔐 Wallet Verification</b>

${isLocalDev ? 'Open this link in your browser:' : 'Click the button below to connect your Solana wallet and verify your reputation.'}

<b>What happens next:</b>
✅ Connect your wallet (Phantom, Solflare, Backpack, etc.)
✅ Sign a message to prove ownership (FREE - no gas fees!)
✅ We check your FairScore
✅ You get access if you meet the threshold

${isLocalDev ? `<b>Verification Link:</b>\n<code>${verificationUrl}</code>` : 'Ready? Click the button below! 👇'}
  `.trim();

  try {
    const options: any = {};
    if (!isLocalDev) {
      options.reply_markup = {
        inline_keyboard: [
          [{ text: '🔗 Verify Wallet', url: verificationUrl }]
        ]
      };
    }
    await sendHTMLMessage(bot, chatId, message, options);
    logger.info('/verify command handled', { userId, chatId });
  } catch (error) {
    logger.error('Failed to handle /verify command', { userId, chatId, error });
  }
}

/**
 * Handle /status command
 */
export async function handleStatus(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    await sendHTMLMessage(bot, chatId, '❌ Unable to identify user. Please try again.');
    return;
  }

  try {
    // Check if user is verified
    const { data: member, error } = await supabase
      .from('members')
      .select('*, groups(*)')
      .eq('telegram_id', userId)
      .single();

    if (error || !member) {
      const message = `
<b>❌ Not Verified</b>

You haven't verified your wallet yet.

Use /verify to get started!
      `.trim();

      await sendHTMLMessage(bot, chatId, message);
      logger.info('/status command - user not verified', { userId });
      return;
    }

    const walletShort = `${member.wallet_address.slice(0, 4)}...${member.wallet_address.slice(-4)}`;
    const lastChecked = new Date(member.last_checked).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const message = `
<b>✅ Verification Status</b>

<b>Wallet:</b> <code>${walletShort}</code>
<b>FairScore:</b> ${member.fairscore} / 1000
<b>Tier:</b> ${member.tier.toUpperCase()}
<b>Last Checked:</b> ${lastChecked}

<b>Group: ${member.groups.name}</b>
🥉 Bronze: ${member.groups.bronze_threshold}+
🥈 Silver: ${member.groups.silver_threshold}+
🥇 Gold: ${member.groups.gold_threshold}+

${member.fairscore >= member.groups.gold_threshold ? '🎉 You have the highest tier!' :
  member.fairscore >= member.groups.silver_threshold ? '💪 Keep building reputation to reach Gold!' :
  member.fairscore >= member.groups.bronze_threshold ? '📈 Keep going to reach Silver tier!' :
  '⚠️ Your score is below Bronze threshold!'}
    `.trim();

    await sendHTMLMessage(bot, chatId, message);
    logger.info('/status command handled', { userId, fairscore: member.fairscore, tier: member.tier });
  } catch (error) {
    logger.error('Failed to handle /status command', { userId, chatId, error });
    await sendHTMLMessage(bot, chatId, '❌ An error occurred. Please try again later.');
  }
}

/**
 * Handle /help command
 */
export async function handleHelp(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  const message = `
<b>📚 Help & Commands</b>

<b>Available Commands:</b>

/start - Get started with Alpha Groups
/verify - Verify your Solana wallet
/status - Check your verification status
/admin - Set up admin dashboard (group admins only)
/help - Show this help message

<b>How Verification Works:</b>

1. Use /verify to get a verification link
2. Click the link and connect your Solana wallet
3. Sign a message (free, no gas fees!)
4. We check your FairScore (0-1000)
5. If you meet the threshold, you get access!

<b>About FairScore:</b>

FairScore is a reputation rating (0-1000) based on your on-chain activity on Solana. It measures:
• Transaction history quality
• NFT holdings and activity
• DeFi participation
• Community involvement
• And more!

<b>About Tiers:</b>

Groups have three tiers with different reputation thresholds:
🥉 <b>Bronze</b> - Entry level (typically 300+)
🥈 <b>Silver</b> - Regular members (typically 500+)
🥇 <b>Gold</b> - Trusted members (typically 700+)

Your tier is automatically updated daily based on your current FairScore.

<b>Need More Help?</b>

Visit our website or contact the group admin.
  `.trim();

  try {
    await sendHTMLMessage(bot, chatId, message);
    logger.info('/help command handled', { userId, chatId });
  } catch (error) {
    logger.error('Failed to handle /help command', { userId, chatId, error });
  }
}

/**
 * Handle new member join event
 */
export async function handleNewMember(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id;
  const newMembers = msg.new_chat_members;

  if (!newMembers || newMembers.length === 0) return;

  // Look up group to include gid in URL
  const { data: group } = await supabase
    .from('groups')
    .select('id')
    .eq('telegram_group_id', chatId)
    .single();

  for (const member of newMembers) {
    // Skip if the new member is a bot
    if (member.is_bot) continue;

    const userId = member.id;
    let verificationUrl = `${FRONTEND_URL}/verify?tid=${userId}`;
    if (group) {
      verificationUrl += `&gid=${group.id}`;
    }
    const isLocalDev = FRONTEND_URL.includes('localhost');

    const message = `
<b>👋 Welcome ${member.first_name}!</b>

This is a reputation-gated community. To stay in the group, you need to verify your Solana wallet.

<b>Quick Start:</b>
1. ${isLocalDev ? 'Open the link below' : 'Click the button below'}
2. Connect your wallet
3. Sign the message (free!)
4. Get verified and stay in the group

${isLocalDev ? `<b>Verification Link:</b>\n<code>${verificationUrl}</code>\n\n` : ''}You have 24 hours to verify. Use /verify anytime to get the verification link.
    `.trim();

    try {
      const options: any = {};
      if (!isLocalDev) {
        options.reply_markup = {
          inline_keyboard: [
            [{ text: '🔗 Verify Now', url: verificationUrl }]
          ]
        };
      }
      await sendHTMLMessage(bot, chatId, message, options);
      logger.info('New member join notification sent', { userId, chatId });
    } catch (error) {
      logger.error('Failed to send new member notification', { userId, chatId, error });
    }
  }
}

/**
 * Handle bot added to group event
 */
export async function handleBotAddedToGroup(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id;
  const groupName = msg.chat.title || 'Unknown Group';

  // Check if bot was added
  const newMembers = msg.new_chat_members;
  if (!newMembers) return;

  const botMe = await bot.getMe();
  const botAdded = newMembers.some((m: TelegramBot.User) => m.is_bot && m.username === botMe.username);
  if (!botAdded) return;

  try {
    // Register group in database
    const { data: existingGroup } = await supabase
      .from('groups')
      .select('id')
      .eq('telegram_group_id', chatId)
      .single();

    if (!existingGroup) {
      const { error } = await supabase
        .from('groups')
        .insert({
          telegram_group_id: chatId,
          name: groupName,
          bronze_threshold: 300,
          silver_threshold: 500,
          gold_threshold: 700,
          auto_kick_enabled: true,
          recheck_frequency: 'daily'
        });

      if (error) {
        logger.error('Failed to register group', { chatId, groupName, error });
      } else {
        logger.info('Group registered successfully', { chatId, groupName });
      }
    }

    const message = `
<b>🤖 Alpha Groups Bot Activated!</b>

Thanks for adding me to <b>${groupName}</b>!

<b>I help manage reputation-gated communities using FairScale.</b>

<b>What I do:</b>
✅ Verify members' Solana wallets
✅ Check FairScore (on-chain reputation)
✅ Automatically manage access based on reputation
✅ Daily re-checks and tier adjustments

<b>Default Settings:</b>
🥉 Bronze: 300+ FairScore
🥈 Silver: 500+ FairScore
🥇 Gold: 700+ FairScore

<b>For Members:</b>
Use /verify to verify your wallet and gain access!

<b>For Admins:</b>
Use /admin to set up the admin dashboard where you can customize thresholds, view analytics, and manage members.

Let's build a quality community! 🚀
    `.trim();

    await sendHTMLMessage(bot, chatId, message);
    logger.info('Bot added to group message sent', { chatId, groupName });
  } catch (error) {
    logger.error('Failed to handle bot added to group', { chatId, groupName, error });
  }
}

/**
 * Handle /admin command
 */
export async function handleAdmin(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (msg.chat.type === 'private') {
    await sendHTMLMessage(bot, chatId, 'Use /admin in a group chat, not in private messages.');
    return;
  }

  if (!userId) {
    await sendHTMLMessage(bot, chatId, 'Unable to identify user. Please try again.');
    return;
  }

  try {
    // Check if user is a group admin
    const member = await bot.getChatMember(chatId, userId);
    if (member.status !== 'creator' && member.status !== 'administrator') {
      await sendHTMLMessage(bot, chatId, 'Only group admins can use this command.');
      return;
    }

    // Look up group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('telegram_group_id', chatId)
      .single();

    if (groupError || !group) {
      await sendHTMLMessage(bot, chatId, 'This group is not registered. Remove and re-add the bot.');
      return;
    }

    const isLocalDev = FRONTEND_URL.includes('localhost');

    // Check if this specific user already registered as admin for this group
    const { data: regTokens } = await supabase
      .from('admin_registration_tokens')
      .select('*')
      .eq('telegram_user_id', userId)
      .eq('group_id', group.id);

    const regToken = regTokens?.find((t: any) => t.used_at != null);

    if (regToken) {
      const loginUrl = `${FRONTEND_URL}/admin/login`;
      const message = `
<b>Admin Dashboard</b>

You already have an admin account for this group. Log in to access your dashboard:

${isLocalDev ? `<b>Login:</b>\n<code>${loginUrl}</code>` : ''}
      `.trim();

      const options: any = {};
      if (!isLocalDev) {
        options.reply_markup = {
          inline_keyboard: [
            [{ text: 'Open Dashboard', url: loginUrl }]
          ]
        };
      }

      await sendHTMLMessage(bot, chatId, message, options);
      return;
    }

    // Check if this user already has an admin account (registered via another group)
    const { data: existingAdmin } = await supabase
      .from('admins')
      .select('id')
      .eq('telegram_user_id', userId)
      .maybeSingle();

    if (existingAdmin) {
      // Auto-link this admin to the new group
      await supabase.from('group_admins').insert({
        group_id: group.id,
        admin_id: existingAdmin.id,
        role: 'admin'
      });

      // Mark a token as used for this group so future /admin calls hit the "already registered" path
      const autoToken = crypto.randomBytes(32).toString('hex');
      await supabase.from('admin_registration_tokens').insert({
        token: autoToken,
        telegram_user_id: userId,
        telegram_username: msg.from?.username || null,
        group_id: group.id,
        expires_at: new Date().toISOString(),
        used_at: new Date().toISOString()
      });

      logger.info('Auto-linked existing admin to new group', { userId, adminId: existingAdmin.id, groupId: group.id });

      const loginUrl = `${FRONTEND_URL}/admin/login`;
      const message = `
<b>Admin Dashboard</b>

Your existing admin account has been linked to <b>${group.name}</b>. Log in to access your dashboard:

${isLocalDev ? `<b>Login:</b>\n<code>${loginUrl}</code>` : ''}
      `.trim();

      const options: any = {};
      if (!isLocalDev) {
        options.reply_markup = {
          inline_keyboard: [
            [{ text: 'Open Dashboard', url: loginUrl }]
          ]
        };
      }

      await sendHTMLMessage(bot, chatId, message, options);
      return;
    }

    // Generate token (64 hex chars)
    const token = crypto.randomBytes(32).toString('hex');

    // Insert registration token
    const { error: insertError } = await supabase
      .from('admin_registration_tokens')
      .insert({
        token,
        telegram_user_id: userId,
        telegram_username: msg.from?.username || null,
        group_id: group.id,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });

    if (insertError) {
      logger.error('Failed to create registration token', { error: insertError });
      await sendHTMLMessage(bot, chatId, 'Failed to generate registration link. Please try again.');
      return;
    }

    const registrationUrl = `${FRONTEND_URL}/admin/register?token=${token}`;

    const message = `
<b>Admin Registration</b>

${isLocalDev ? 'Open this link in your browser to set up your admin account:' : 'Click the button below to set up your admin account.'}

${isLocalDev ? `<b>Registration Link:</b>\n<code>${registrationUrl}</code>` : 'This link expires in 1 hour.'}
    `.trim();

    const options: any = {};
    if (!isLocalDev) {
      options.reply_markup = {
        inline_keyboard: [
          [{ text: 'Register as Admin', url: registrationUrl }]
        ]
      };
    }

    await sendHTMLMessage(bot, chatId, message, options);
    logger.info('/admin command handled', { userId, chatId, groupId: group.id });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    logger.error('Failed to handle /admin command', { userId, chatId, error: errMsg, stack: errStack });
    await sendHTMLMessage(bot, chatId, 'An error occurred. Please try again later.');
  }
}

/**
 * Register all command handlers
 */
export function registerHandlers(bot: TelegramBot): void {
  bot.onText(/\/start/, (msg) => handleStart(bot, msg));
  bot.onText(/\/verify/, (msg) => handleVerify(bot, msg));
  bot.onText(/\/status/, (msg) => handleStatus(bot, msg));
  bot.onText(/\/help/, (msg) => handleHelp(bot, msg));
  bot.onText(/\/admin/, (msg) => handleAdmin(bot, msg));

  bot.on('new_chat_members', (msg) => handleNewMember(bot, msg));
  bot.on('new_chat_members', (msg) => handleBotAddedToGroup(bot, msg));

  logger.info('All command handlers registered');
}
