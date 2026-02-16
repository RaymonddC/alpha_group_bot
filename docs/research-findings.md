# Alpha Groups - Research Findings

**Project:** Reputation-Gated Telegram Communities using FairScale on Solana
**Date:** 2026-02-16
**Researcher:** Research Agent
**Purpose:** Document best practices for building secure, scalable Alpha Groups bot

---

## Executive Summary

This document synthesizes research across four critical technical areas for building Alpha Groups:

1. **Solana Wallet Signature Verification** - Cryptographic security foundation
2. **FairScale API Integration** - Reputation scoring and rate limiting
3. **Telegram Bot API Security** - Bot token protection and anti-abuse
4. **Supabase Schema Optimization** - Database performance and security

### Key Recommendations

✅ **Use Sign In With Solana (SIWS)** instead of raw signMessage for better security
✅ **Implement webhook-based Telegram bot** with secret token verification (not polling)
✅ **Index all RLS policy columns** in Supabase for 100x+ performance improvements
✅ **Cache FairScale scores** with appropriate TTL (1-6 hours) using Redis
✅ **Use connection pooling** (port 6543) for all Supabase queries from serverless functions

---

## 1. Solana Wallet Signature Verification

### 1.1 Core Cryptographic Foundations

**Ed25519 Algorithm:**
Solana uses Ed25519 for digital signatures, providing strong cryptographic security. All off-chain messages MUST be signed using the ed25519 scheme only ([Solana Off-chain Message Signing](https://docs.anza.xyz/proposals/off-chain-message-signing)).

**Signature Verification with TweetNaCl:**
```javascript
import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';

function verifySolanaSignature(publicKeyStr, message, signatureArray) {
  try {
    const publicKey = new PublicKey(publicKeyStr);
    const publicKeyBytes = publicKey.toBytes();
    const messageBytes = new TextEncoder().encode(message);
    const signature = new Uint8Array(signatureArray);

    return nacl.sign.detached.verify(messageBytes, signature, publicKeyBytes);
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
}
```

**Source:** [RareSkills - Ed25519 Signature Verification in Solana](https://rareskills.io/post/solana-signature-verification)

### 1.2 Nonce Generation and Replay Attack Prevention

**Critical Security Requirement:**
Every signature verification MUST include anti-replay mechanisms to prevent attackers from reusing valid signatures.

**Three-Layer Defense:**

1. **Timestamp Validation** - Message must be signed within ±10 minutes of verification time
2. **Nonce Generation** - Use `Date.now()` or `crypto.randomBytes()` for unique nonce per signature
3. **Durable Nonce Accounts** (for on-chain) - Solana's nonce accounts ensure each value is used only once

**Replay Attack Prevention:**
Solana prevents replay attacks by disallowing identical transactions and requiring recent blockhashes (151 slots / 1-2 minutes max age). For off-chain signatures, implement timestamp checks and store used nonces in database ([Solana Transactions: Durable Nonces](https://www.helius.dev/blog/solana-transactions)).

**Recommended Message Format:**
```javascript
const message = `Verify wallet for Alpha Groups

Telegram ID: ${telegramId}
Nonce: ${crypto.randomUUID()}
Timestamp: ${new Date().toISOString()}

This signature is free and safe.`;
```

**Validation Logic:**
```javascript
// 1. Verify signature cryptographically
const isValid = verifySolanaSignature(publicKey, message, signature);
if (!isValid) return false;

// 2. Extract and validate timestamp (within 10 minutes)
const timestamp = extractTimestamp(message);
const now = Date.now();
const diff = Math.abs(now - timestamp);
if (diff > 10 * 60 * 1000) return false; // 10 minutes

// 3. Check nonce hasn't been used (query database)
const nonceUsed = await checkNonceExists(nonce);
if (nonceUsed) return false;

// 4. Store nonce to prevent reuse
await storeNonce(nonce, telegramId);
```

**Sources:**
- [Solana Multisig Security](https://osec.io/blog/2025-02-22-multisig-security/)
- [Solana Durable Nonces Guide](https://www.quicknode.com/guides/solana-development/transactions/how-to-send-offline-tx)

### 1.3 Sign In With Solana (SIWS) - Modern Best Practice

**Why SIWS is Superior:**
Instead of custom message formats, use [Sign In With Solana (SIWS)](https://github.com/phantom/sign-in-with-solana) for standardized, secure authentication.

**Benefits:**
- ✅ Wallets construct the message (not the dapp), preventing malicious message injection
- ✅ Standardized format allows wallets to validate domain, timestamp, and nonce automatically
- ✅ Built-in support in Phantom, Solflare, and other major wallets
- ✅ Full support in `@solana/wallet-adapter-react`

**Implementation:**
```javascript
import { useWallet } from '@solana/wallet-adapter-react';

const { publicKey, signIn } = useWallet();

// SIWS replaces signMessage
const signInData = await signIn({
  domain: 'alpha-groups.xyz',
  statement: 'Verify your wallet to access reputation-gated communities',
  nonce: crypto.randomUUID(),
});

// Backend verification
const isValid = await verifySIWS(signInData);
```

**Sources:**
- [Phantom SIWS Documentation](https://phantom.com/learn/developers/sign-in-with-solana)
- [Phantom SIWS Implementation](https://docs.phantom.com/resources/recipes)

### 1.4 Common Pitfalls and Encoding Issues

**Base58 vs Base64 Encoding:**
Solana is migrating from Base58 to Base64 for performance reasons. Base58 decoding is slower and has a 129-byte size limit ([Solana Base58 Migration Issue](https://github.com/solana-labs/solana/issues/12700)).

**Critical Encoding Issues:**

1. **Public Key Format** - Use `PublicKey.toBytes()` for verification, not Base58 string
2. **Signature Format** - Frontend sends signature as `Array.from(signature)`, backend converts to `Uint8Array`
3. **Message Encoding** - Always use `TextEncoder().encode()` for consistent UTF-8 encoding

**Common Mistakes:**
```javascript
// ❌ WRONG - Using Base58 string directly
nacl.sign.detached.verify(message, signature, publicKeyString);

// ✅ CORRECT - Convert to bytes first
const publicKeyBytes = new PublicKey(publicKeyString).toBytes();
nacl.sign.detached.verify(message, signature, publicKeyBytes);
```

**Source:** [Solana Keypair Base58 Conversion](https://gist.github.com/Xavier59/b0b216f003b8e54db53c39397e98cd70)

### 1.5 Phantom/Solflare Wallet Adapter Integration

**Unified Wallet Support:**
```javascript
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

const wallets = useMemo(
  () => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ],
  []
);
```

**signMessage Best Practices:**
- Always provide clear, human-readable message explaining what user is signing
- Never sign transactions or sensitive data via signMessage (use signTransaction instead)
- Display wallet address in UI so user can verify which wallet is being used

**Sources:**
- [Phantom Wallet Adapter Source](https://github.com/anza-xyz/wallet-adapter/blob/master/packages/wallets/phantom/src/adapter.ts)
- [Solana Wallet Integration Guide](https://lorisleiva.com/create-a-solana-dapp-from-scratch/integrating-with-solana-wallets)

---

## 2. FairScale API Integration

### 2.1 API Authentication

**Method:** API key-based authentication via HTTP header

**Implementation:**
```javascript
const response = await axios.get(
  `https://api.fairscale.xyz/v1/score/${walletAddress}`,
  {
    headers: {
      'fairkey': process.env.FAIRSCALE_API_KEY,
      'Content-Type': 'application/json'
    }
  }
);
```

**Security Best Practices:**
- Store API key in environment variables (never in source code)
- Use server-side API calls only (never expose key to frontend)
- Rotate API keys every 6 months
- Monitor API usage for anomalies

**Source:** [FairScale API Documentation](https://docs.fairscale.xyz/docs/introduction)

### 2.2 Rate Limits and Batch Endpoints

**Rate Limiting:**
- Rate limits are applied **per API key**
- Specific limits not publicly documented - contact FairScale support for details
- Implement exponential backoff for 429 (Too Many Requests) errors

**Batch Processing Recommendation:**
For daily re-checks of all members, implement batching to minimize API calls:

```javascript
// Instead of individual calls for each member
async function recheckAllMembers(members) {
  const batchSize = 50; // Adjust based on rate limits

  for (let i = 0; i < members.length; i += batchSize) {
    const batch = members.slice(i, i + batchSize);

    // Process batch with delay
    const scores = await Promise.all(
      batch.map(m => getFairScoreWithRetry(m.wallet_address))
    );

    // Wait between batches to respect rate limits
    await sleep(1000); // 1 second between batches
  }
}

async function getFairScoreWithRetry(wallet, retries = 3) {
  try {
    return await getFairScore(wallet);
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      await sleep(2 ** (3 - retries) * 1000); // Exponential backoff
      return getFairScoreWithRetry(wallet, retries - 1);
    }
    throw error;
  }
}
```

**Source:** [FairScale API Introduction](https://docs.fairscale.xyz/docs/introduction)

### 2.3 Caching Strategies for FairScores

**Why Cache:**
- FairScore changes slowly (based on on-chain activity)
- Reduces API costs and latency
- Improves user experience during verification

**Recommended Caching Strategy:**

**Cache-Aside Pattern** with Redis ([Redis Caching Guide](https://www.leadwithskills.com/blogs/redis-caching-strategies-nodejs-api)):

```javascript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

async function getFairScoreWithCache(walletAddress) {
  const cacheKey = `fairscore:${walletAddress}`;

  // 1. Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Fetch from API if cache miss
  const score = await getFairScore(walletAddress);

  // 3. Store in cache with TTL
  await redis.setex(cacheKey, 3600, JSON.stringify(score)); // 1 hour TTL

  return score;
}

// Invalidate cache when score is re-checked
async function recheckMember(member) {
  const newScore = await getFairScore(member.wallet_address);

  // Update cache
  const cacheKey = `fairscore:${member.wallet_address}`;
  await redis.setex(cacheKey, 3600, JSON.stringify(newScore));

  return newScore;
}
```

**TTL Recommendations:**
- **Initial verification:** 1 hour (scores unlikely to change during onboarding)
- **Daily re-checks:** 6 hours (allow time for on-chain activity to settle)
- **High-tier users (Gold):** 12 hours (reputation is stable)
- **Low-tier users (Bronze):** 3 hours (more volatile scores)

**Cache Invalidation:**
- Invalidate on manual admin re-check
- Invalidate after tier change notification
- Always set TTL to prevent stale data accumulation

**Sources:**
- [Redis + Local Cache Best Practices](https://medium.com/@max980203/redis-local-cache-implementation-and-best-practices-f63ddee2654a)
- [Node.js API Caching Guide](https://www.randomizeblog.com/caching-nodejs/)

### 2.4 Error Handling for API Failures

**Graceful Degradation:**

```javascript
async function getFairScore(walletAddress) {
  try {
    const response = await axios.get(
      `${FAIRSCALE_API_URL}/v1/score/${walletAddress}`,
      {
        headers: { 'fairkey': FAIRSCALE_API_KEY },
        timeout: 5000 // 5 second timeout
      }
    );

    return response.data.score || 0;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      // Timeout - use cached score or deny access
      console.error('FairScale API timeout');
      return getCachedScore(walletAddress) || 0;
    }

    if (error.response?.status === 404) {
      // Wallet not found - new wallet with no history
      return 0;
    }

    if (error.response?.status >= 500) {
      // Server error - retry with backoff
      throw new Error('FairScale API unavailable, retry later');
    }

    // Unknown error - deny access for security
    console.error('FairScale API error:', error);
    return 0;
  }
}
```

**Monitoring:**
- Log all API errors with wallet address and error code
- Set up alerts for error rate > 5%
- Track API response times (target < 500ms p95)

---

## 3. Telegram Bot API Security

### 3.1 Webhook vs Polling - Production Recommendation

**CRITICAL: Use Webhooks in Production**

**Why Webhooks are Superior:**
- ✅ Real-time message delivery (instant vs 1-2 second polling delay)
- ✅ No wasted bandwidth - only pay for actual messages
- ✅ Scalable to 100,000+ users without server overhead
- ✅ Lower latency and better user experience

**When to Use Polling:**
- Local development without HTTPS
- Testing environments
- Bots with < 10 users

**Sources:**
- [Telegram Webhook vs Polling Guide](https://hostman.com/tutorials/difference-between-polling-and-webhook-in-telegram-bots/)
- [grammY Deployment Types](https://grammy.dev/guide/deployment-types)

### 3.2 Webhook Security Best Practices

**CRITICAL Security Requirement: Secret Token Verification**

⚠️ **97% of bots skip this and are vulnerable to spoofing attacks** ([Telegram Webhook Guide](https://copyprogramming.com/howto/python-telegram-bot-using-webhook))

**Implementation:**
```javascript
// 1. Set webhook with secret token
await bot.setWebHook(`https://yourapp.com/webhook`, {
  secret_token: process.env.TELEGRAM_SECRET_TOKEN // 32+ characters
});

// 2. Verify secret on every request
app.post('/webhook', (req, res) => {
  const receivedToken = req.headers['x-telegram-bot-api-secret-token'];

  if (receivedToken !== process.env.TELEGRAM_SECRET_TOKEN) {
    console.error('Invalid secret token - potential attack!');
    return res.status(403).send('Forbidden');
  }

  // Process update
  bot.processUpdate(req.body);
  res.sendStatus(200);
});
```

**Why This Matters:**
Without secret token verification, attackers can send fake updates to your webhook endpoint pretending to be Telegram. This allows message injection, command spoofing, and data theft.

**HTTPS Requirements:**
- Use TLS 1.2+ with modern cipher suites
- Certificate from trusted CA (Let's Encrypt, DigiCert, etc.)
- Valid domain (self-signed certs rejected by Telegram)

**Sources:**
- [Telegram Webhooks Security Guide](https://core.telegram.org/bots/webhooks)
- [Telegram Bot Security 2026](https://copyprogramming.com/howto/python-telegram-bot-using-webhook)

### 3.3 Bot Token Security

**Critical Best Practices:**

1. **Never Hardcode Tokens**
```javascript
// ❌ WRONG
const bot = new TelegramBot('1234567890:ABCdefGHI...');

// ✅ CORRECT
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
```

2. **Rotate Tokens Every 6 Months**
- Use BotFather's `/revoke` command
- Update environment variables in all deployments
- Monitor for unauthorized API calls

3. **Store Securely**
- Use secret managers (AWS Secrets Manager, HashiCorp Vault)
- Never commit to Git (add `.env` to `.gitignore`)
- Restrict access to production tokens (only senior devs)

**Token Compromise Response:**
1. Immediately revoke token via BotFather
2. Generate new token
3. Update all production deployments
4. Audit logs for suspicious activity
5. Notify users if data breach suspected

**Source:** [Telegram Bot Security Best Practices](https://alexhost.com/faq/what-are-the-best-practices-for-building-secure-telegram-bots/)

### 3.4 Rate Limiting Considerations

**Telegram's Rate Limits:**

| Scope | Limit | Details |
|-------|-------|---------|
| **Individual Chats** | 1 message/second | Short bursts allowed, then 429 errors |
| **Groups** | 20 messages/minute | Bot-wide limit across all groups |
| **Bulk Notifications** | ~30 users/second | For broadcasting to multiple users |

**Implementation:**
```javascript
import PQueue from 'p-queue';

// Create rate-limited queue
const messageQueue = new PQueue({
  interval: 1000, // 1 second
  intervalCap: 1  // 1 message per second
});

async function sendSafely(chatId, message) {
  return messageQueue.add(() => bot.sendMessage(chatId, message));
}

// For groups, use separate queue
const groupQueue = new PQueue({
  interval: 60000, // 1 minute
  intervalCap: 20   // 20 messages per minute
});
```

**Handling 429 Errors:**
```javascript
async function sendWithRetry(chatId, message, retries = 3) {
  try {
    return await bot.sendMessage(chatId, message);
  } catch (error) {
    if (error.response?.statusCode === 429 && retries > 0) {
      const retryAfter = error.response.parameters?.retry_after || 30;
      await sleep(retryAfter * 1000);
      return sendWithRetry(chatId, message, retries - 1);
    }
    throw error;
  }
}
```

**Sources:**
- [Telegram Bot Rate Limits](https://github.com/python-telegram-bot/python-telegram-bot/wiki/Avoiding-flood-limits)
- [Telegram API Rate Limits Explained](https://www.byteplus.com/en/topic/450600)

### 3.5 Anti-Abuse Patterns

**Input Validation:**
```javascript
function sanitizeUserInput(text) {
  // Limit length
  if (text.length > 4096) {
    text = text.substring(0, 4096);
  }

  // Remove potentially malicious content
  text = text.replace(/<script>/gi, '');

  // Escape HTML
  text = text.replace(/[<>&'"]/g, (c) => {
    return {'<':'&lt;', '>':'&gt;', '&':'&amp;', "'":"'", '"':'&quot;'}[c];
  });

  return text;
}
```

**Command Throttling:**
```javascript
const userCommandRates = new Map();

function checkCommandRate(userId) {
  const now = Date.now();
  const userHistory = userCommandRates.get(userId) || [];

  // Keep only last minute
  const recentCommands = userHistory.filter(t => now - t < 60000);

  if (recentCommands.length >= 10) {
    return false; // Too many commands
  }

  recentCommands.push(now);
  userCommandRates.set(userId, recentCommands);
  return true;
}

bot.on('message', (msg) => {
  if (!checkCommandRate(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, 'Too many commands, please slow down.');
  }

  // Process command
});
```

**Source:** [Telegram Bot Security Guide](https://bazucompany.com/blog/how-to-secure-telegram-bots-with-authentication-and-encryption-comprehensive-guide-for-businesses/)

### 3.6 Group Management Permissions

**Required Bot Permissions:**

To manage group members, the bot must have:
- ✅ `can_restrict_members` - Required for banChatMember and unbanChatMember
- ✅ Admin status in the group

**banChatMember:**
```javascript
// Kick member from group
await bot.banChatMember(groupId, userId);

// Note: User cannot rejoin via invite links unless unbanned
```

**unbanChatMember:**
```javascript
// Unban user (allows them to rejoin)
await bot.unbanChatMember(groupId, userId, {
  only_if_banned: true // Ensures user was actually banned
});

// Note: User must rejoin manually via invite link
```

**Important Behaviors:**
- Banned users cannot rejoin via invite links
- Unbanning does NOT automatically add user back to group
- Bot must be admin to perform these actions
- Actions fail silently in private chats

**Source:** [Telegram Bot API - banChatMember](https://core.telegram.org/bots/api)

---

## 4. Supabase Schema Optimization

### 4.1 Indexing Strategies for Alpha Groups Tables

**Critical Performance Rule:**
**Every column used in RLS policies MUST have an index** for 100x+ performance gains ([Supabase RLS Performance](https://supaexplorer.com/best-practices/supabase-postgres/security-rls-performance/)).

**Recommended Indexes:**

```sql
-- Groups table
CREATE INDEX idx_groups_telegram_id ON groups(telegram_group_id);

-- Members table (CRITICAL)
CREATE INDEX idx_members_group_id ON members(group_id);
CREATE INDEX idx_members_wallet ON members(wallet_address);
CREATE INDEX idx_members_telegram_id ON members(telegram_id);
CREATE INDEX idx_members_tier ON members(tier);  -- For tier-based queries
CREATE INDEX idx_members_last_checked ON members(last_checked);  -- For re-check scheduling

-- Composite index for common queries
CREATE INDEX idx_members_group_tier ON members(group_id, tier);

-- Verifications table
CREATE INDEX idx_verifications_telegram_id ON verifications(telegram_id);
CREATE INDEX idx_verifications_wallet ON verifications(wallet_address);
CREATE INDEX idx_verifications_verified_at ON verifications(verified_at DESC);

-- Activity log
CREATE INDEX idx_activity_member_id ON activity_log(member_id);
CREATE INDEX idx_activity_created_at ON activity_log(created_at DESC);

-- Admins table
CREATE INDEX idx_admins_email ON admins(email);  -- For login lookups
```

**Why Indexing Matters:**
Without indexes on RLS policy columns (e.g., `user_id` in `auth.uid() = user_id`), Postgres performs sequential scans on every row. This causes 100x+ slowdowns on tables with 1,000+ rows.

**Sources:**
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Optimize RLS Policies for Performance](https://supaexplorer.com/best-practices/supabase-postgres/security-rls-performance/)

### 4.2 Row Level Security (RLS) Policies

**Enable RLS from Day One:**
Never postpone RLS - it's harder to add later ([Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)).

**Example Policies for Alpha Groups:**

```sql
-- Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Groups: Admins can manage groups
CREATE POLICY "Admins can view their groups"
ON groups FOR SELECT
USING (
  id IN (
    SELECT group_id FROM group_admins
    WHERE admin_id = auth.uid()
  )
);

CREATE POLICY "Admins can update their groups"
ON groups FOR UPDATE
USING (
  id IN (
    SELECT group_id FROM group_admins
    WHERE admin_id = auth.uid()
  )
);

-- Members: Admins can view/manage members of their groups
CREATE POLICY "Admins can view members"
ON members FOR SELECT
USING (
  group_id IN (
    SELECT group_id FROM group_admins
    WHERE admin_id = auth.uid()
  )
);

CREATE POLICY "Admins can update members"
ON members FOR UPDATE
USING (
  group_id IN (
    SELECT group_id FROM group_admins
    WHERE admin_id = auth.uid()
  )
);

-- Activity log: Admins can view activity for their groups
CREATE POLICY "Admins can view activity"
ON activity_log FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members
    WHERE group_id IN (
      SELECT group_id FROM group_admins
      WHERE admin_id = auth.uid()
    )
  )
);
```

**Performance Optimization for RLS:**

1. **Wrap auth.uid() in function** to cache result per statement:
```sql
CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE;

-- Use in policies
CREATE POLICY "example"
ON table FOR SELECT
USING (user_id = auth.current_user_id());  -- Cached per statement
```

2. **Avoid correlated subqueries** - use joins instead:
```sql
-- ❌ SLOW - Correlated subquery
WHERE EXISTS (SELECT 1 FROM other_table WHERE other_table.id = table.user_id AND other_table.admin = true)

-- ✅ FAST - Join
WHERE user_id IN (SELECT id FROM other_table WHERE admin = true)
```

**Sources:**
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase RLS Real Examples](https://medium.com/@jigsz6391/supabase-row-level-security-explained-with-real-examples-6d06ce8d221c)

### 4.3 Connection Pooling Best Practices

**Why Connection Pooling Matters:**
Serverless functions (Vercel, Railway) create new database connections on every request. Without pooling, you'll hit Postgres connection limits (25-100 depending on plan) and cause failures.

**Use PgBouncer (Port 6543):**

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    db: {
      // Use port 6543 for pooled connections
      schema: 'public',
    },
    global: {
      headers: { 'x-my-custom-header': 'my-app-name' },
    },
  }
);

// Connection string for Prisma/Drizzle
// postgresql://postgres:password@db.project.supabase.co:6543/postgres?pgbouncer=true
```

**Pool Size Guidelines:**
- If using PostgREST API heavily: Keep pool at 40% of total connections
- Otherwise: Use up to 80% of connections for pool
- Monitor connection usage in Supabase dashboard

**Transaction Mode Limitations:**
PgBouncer in Transaction mode (Supabase default) does NOT support:
- Prepared statements
- LISTEN/NOTIFY
- Cursors
- Advisory locks

**Workaround for Unsupported Features:**
Use direct connection (port 5432) for operations requiring these features, pooled connection (port 6543) for everything else.

**Sources:**
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [PgBouncer in Supabase](https://supabase.com/blog/supabase-pgbouncer)

### 4.4 Real-time Subscription Patterns

**Use Real-time Subscriptions Carefully:**
Real-time subscriptions have significant performance implications at scale.

**Scaling Dynamics:**
For every insert/update/delete, Supabase checks RLS policies for EACH subscribed user. With 100 subscribed users and 1 insert, that's 100 database reads ([Supabase Real-time Performance](https://supabase.com/docs/guides/realtime/postgres-changes)).

**Performance Bottleneck:**
Database changes are processed on a single thread to maintain order. CPU upgrades don't help much with Postgres Changes subscriptions.

**Recommendations for Alpha Groups:**

1. **Avoid real-time subscriptions for member lists** - Use polling (refresh every 30-60 seconds)
2. **Use Broadcast channels** for admin notifications instead of Postgres Changes
3. **Separate "public" table without RLS** for high-volume real-time data

**When to Use Real-time:**
- Admin dashboard notifications (< 10 concurrent admins)
- Verification status updates (1 user, temporary subscription)
- Low-frequency events (tier changes, kicks)

**When NOT to Use Real-time:**
- Member list tables (query on page load instead)
- Activity logs (too high frequency)
- Analytics (use aggregated views)

**Example - Safe Real-time Usage:**
```javascript
// ✅ GOOD - Temporary subscription for single verification
const subscription = supabase
  .channel(`verification:${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'verifications',
    filter: `telegram_id=eq.${userId}`
  }, (payload) => {
    console.log('Verification complete!', payload);
    subscription.unsubscribe(); // Clean up immediately
  })
  .subscribe();

// ❌ BAD - Permanent subscription to entire table
supabase
  .channel('all-members')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'members'
  }, (payload) => {
    // This will cause performance issues with 1,000+ members
  })
  .subscribe();
```

**Sources:**
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase Real-time Benchmarks](https://supabase.com/docs/guides/realtime/benchmarks)

---

## 5. Additional Security Recommendations

### 5.1 Environment Variable Security

**Never commit secrets to Git:**
```bash
# .gitignore
.env
.env.local
.env.production
*.pem
*.key
```

**Use different keys for dev/staging/production:**
```bash
# .env.development
FAIRSCALE_API_KEY=dev_key_123
TELEGRAM_BOT_TOKEN=dev_bot_456

# .env.production
FAIRSCALE_API_KEY=prod_key_xyz
TELEGRAM_BOT_TOKEN=prod_bot_abc
```

### 5.2 Logging and Monitoring

**What to Log:**
- ✅ Failed signature verifications (potential attacks)
- ✅ FairScale API errors
- ✅ Rate limit hits
- ✅ Unauthorized admin access attempts
- ❌ Do NOT log: wallet addresses, Telegram IDs, full signatures

**Monitoring Alerts:**
- Signature verification failure rate > 10%
- FairScale API error rate > 5%
- Telegram API 429 errors
- Database query time > 1 second (p95)

---

## 6. Implementation Priorities

### Phase 1: MVP (Week 1-2)
1. ✅ Solana signature verification with SIWS
2. ✅ Basic FairScale API integration (no caching yet)
3. ✅ Telegram webhook with secret token
4. ✅ Supabase schema with indexes and RLS

### Phase 2: Production (Week 3-4)
1. ✅ Redis caching for FairScale scores
2. ✅ Rate limiting and error handling
3. ✅ Connection pooling optimization
4. ✅ Monitoring and alerting

### Phase 3: Scale (Post-launch)
1. ✅ Batch FairScale API calls
2. ✅ Advanced caching strategies
3. ✅ Database query optimization
4. ✅ Load testing and performance tuning

---

## 7. Key Takeaways

### Security
- Use SIWS instead of raw signMessage
- Always verify webhook secret tokens
- Enable RLS from day one
- Index all RLS policy columns

### Performance
- Cache FairScale scores with appropriate TTL
- Use connection pooling (port 6543) for serverless
- Avoid real-time subscriptions for high-volume tables
- Implement rate limiting and exponential backoff

### Reliability
- Handle FairScale API failures gracefully
- Use webhooks (not polling) for production
- Monitor error rates and set up alerts
- Store secrets in environment variables

---

## 8. Sources

All findings in this document are sourced from official documentation and recent (2026) best practices:

### Solana
- [Ed25519 Signature Verification in Solana | RareSkills](https://rareskills.io/post/solana-signature-verification)
- [Solana Off-chain Message Signing](https://docs.anza.xyz/proposals/off-chain-message-signing)
- [Solana Transactions: Durable Nonces](https://www.helius.dev/blog/solana-transactions)
- [Solana Multisig Security](https://osec.io/blog/2025-02-22-multisig-security/)
- [Phantom SIWS Implementation](https://github.com/phantom/sign-in-with-solana)
- [Phantom Developer Recipes](https://docs.phantom.com/resources/recipes)

### FairScale
- [FairScale API Documentation](https://docs.fairscale.xyz/docs/introduction)

### Telegram
- [Long Polling vs. Webhooks | grammY](https://grammy.dev/guide/deployment-types)
- [Telegram Webhook Security Guide](https://core.telegram.org/bots/webhooks)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Avoiding Flood Limits](https://github.com/python-telegram-bot/python-telegram-bot/wiki/Avoiding-flood-limits)
- [Telegram Bot Security Best Practices](https://alexhost.com/faq/what-are-the-best-practices-for-building-secure-telegram-bots/)

### Supabase
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Optimize RLS Policies for Performance](https://supaexplorer.com/best-practices/supabase-postgres/security-rls-performance/)
- [Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Connection Pooling | Supabase Docs](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [PgBouncer in Supabase](https://supabase.com/blog/supabase-pgbouncer)
- [Postgres Changes | Supabase Docs](https://supabase.com/docs/guides/realtime/postgres-changes)

### Caching
- [Redis Caching Strategies for Node.js APIs](https://www.leadwithskills.com/blogs/redis-caching-strategies-nodejs-api)
- [Node.js Caching with Redis](https://www.randomizeblog.com/caching-nodejs/)
- [Redis + Local Cache Best Practices](https://medium.com/@max980203/redis-local-cache-implementation-and-best-practices-f63ddee2654a)

---

**End of Research Findings**

Generated: 2026-02-16
Researcher: Research Agent
Project: Alpha Groups - Reputation-Gated Telegram Communities
