# Alpha Groups - System Architecture

**Version:** 1.0
**Date:** 2026-02-16
**Status:** Approved
**Architect:** Architecture Team

---

## Executive Summary

This document defines the complete system architecture for Alpha Groups, a reputation-gated Telegram bot using FairScale on Solana. The architecture implements all critical research findings to ensure production-ready security, performance, and scalability.

**Architecture Approach:** Production-Ready Monolith
- Single Node.js/Express backend handling both Telegram bot and REST API
- Implements all security and performance best practices from research
- Production-ready from day 1, scales to 100k+ users
- Cost-effective with free tiers available for all services

---

## 1. System Architecture

### 1.1 High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Telegram   │    │ Verification │    │    Admin     │      │
│  │    Users     │    │   Web Page   │    │  Dashboard   │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
└─────────┼────────────────────┼────────────────────┼──────────────┘
          │                    │                    │
          │ Commands           │ SIWS Auth          │ Management
          │ /verify /status    │ Sign Message       │ Analytics
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         BACKEND (Node.js + Express + TypeScript)           │ │
│  │                                                             │ │
│  │  ┌──────────────────┐        ┌──────────────────┐         │ │
│  │  │  Telegram Bot    │        │   REST API       │         │ │
│  │  │  ──────────────  │        │   ───────────    │         │ │
│  │  │  • Webhook recv  │        │   • POST /verify │         │ │
│  │  │  • /start        │        │   • GET /members │         │ │
│  │  │  • /verify       │        │   • POST /settings│        │ │
│  │  │  • /status       │        │   • GET /analytics│        │ │
│  │  │  • Notifications │        │   • POST /cron   │         │ │
│  │  └────────┬─────────┘        └────────┬─────────┘         │ │
│  │           │                           │                    │ │
│  │           └───────────┬───────────────┘                    │ │
│  │                       │                                    │ │
│  │           ┌───────────▼─────────────┐                      │ │
│  │           │   Business Services     │                      │ │
│  │           │   ─────────────────     │                      │ │
│  │           │   • solana-verify.ts   │                      │ │
│  │           │   • fairscale.ts       │                      │ │
│  │           │   • member-checker.ts  │                      │ │
│  │           └───────────┬─────────────┘                      │ │
│  │                       │                                    │ │
│  └───────────────────────┼────────────────────────────────────┘ │
│                          │                                      │
│  ┌───────────────────────▼────────────────────────────────────┐ │
│  │              FRONTEND (Next.js 14)                          │ │
│  │                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │   /verify    │  │ /admin/...   │  │ Components   │    │ │
│  │  │  Wallet UI   │  │  Dashboard   │  │ WalletConnect│    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  └─────────────────────────────────────────────────────────── │ │
└──────────────────────────────────────────────────────────────── ┘
          │                    │                    │
          │ Query DB           │ Cache Get/Set      │ API Calls
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE LAYER                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Supabase   │  │    Redis     │  │  FairScale   │         │
│  │  PostgreSQL  │  │  (Upstash)   │  │     API      │         │
│  │              │  │              │  │              │         │
│  │  • groups    │  │  • Caching   │  │  • Score     │         │
│  │  • members   │  │  • TTL 1-6h  │  │    lookup    │         │
│  │  • verifs    │  │  • Cache-    │  │  • Tier      │         │
│  │  • activity  │  │    aside     │  │    info      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           GitHub Actions (Cron Jobs)                      │  │
│  │           • Daily member re-check (3 AM UTC)             │  │
│  │           • Triggers POST /api/cron/recheck-members      │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow Diagrams

#### Wallet Verification Flow

```
1. User → Telegram Bot: /verify command
2. Bot → User: Sends verification link (https://alpha-groups.vercel.app/verify?tid=123456789)
3. User → Frontend: Opens link, clicks "Connect Wallet"
4. Frontend → Wallet: Requests SIWS signature
5. Wallet → User: Shows signing prompt (no gas, free)
6. User → Wallet: Approves signature
7. Wallet → Frontend: Returns signed SIWS message + signature
8. Frontend → Backend: POST /api/verify with {telegramId, publicKey, signature, message}
9. Backend → Verify Service: Validates ed25519 signature with tweetnacl
10. Backend → Nonce DB: Check if nonce already used (prevent replay)
11. Backend → Redis: Check cache for FairScore
12. Backend → FairScale API: Fetch score if cache miss
13. Backend → Redis: Store score with TTL (1-6 hours based on tier)
14. Backend → Supabase: Insert/update member record with score and tier
15. Backend → Telegram Bot: Grant access (unban user) if score ≥ threshold
16. Backend → Telegram Bot: Send notification to user (success/failure message)
17. Backend → Frontend: Return {success, fairscore, tier}
18. Frontend → User: Display result
```

#### Daily Re-check Flow

```
1. GitHub Actions (3 AM UTC) → Backend: POST /api/cron/recheck-members with auth header
2. Backend → Auth: Verify CRON_SECRET
3. Backend → Supabase: SELECT all members
4. For each member:
   a. Backend → Redis: Check cache for FairScore
   b. Backend → FairScale API: Fetch fresh score (with retry + backoff)
   c. Backend → Calculate new tier based on group thresholds
   d. If tier changed or score dropped:
      - Backend → Supabase: UPDATE member (fairscore, tier, last_checked)
      - Backend → Supabase: INSERT activity_log (action, old_score, new_score)
      - If score < bronze_threshold:
         * Backend → Telegram: Ban user from group
         * Backend → Telegram: Send kick notification to user
      - If tier upgraded (promoted):
         * Backend → Telegram: Send congratulations message
      - If tier downgraded (demoted):
         * Backend → Telegram: Send warning message
   e. Backend → Redis: Update cached score
5. Backend → GitHub Actions: Return {total, kicked, promoted, demoted}
6. GitHub Actions → Logs: Record execution result
```

### 1.3 Deployment Architecture

**Production Infrastructure:**

```
┌─────────────────────────────────────────────────────────────────┐
│                        Production Stack                          │
│                                                                  │
│  Frontend (Vercel):                                             │
│    - Next.js 14 app                                             │
│    - Edge deployment (CDN)                                      │
│    - Auto-scaling                                               │
│    - Domain: alpha-groups.vercel.app                            │
│                                                                  │
│  Backend (Railway/Render):                                      │
│    - Node.js + Express server                                   │
│    - Always-on container                                        │
│    - Auto-restart on failure                                    │
│    - Domain: alpha-groups-api.railway.app                       │
│    - Health checks: /api/health                                 │
│                                                                  │
│  Database (Supabase):                                           │
│    - Managed PostgreSQL                                         │
│    - Connection pooling (port 6543)                             │
│    - Automated backups                                          │
│    - Row Level Security enabled                                 │
│                                                                  │
│  Cache (Upstash Redis):                                         │
│    - Serverless Redis                                           │
│    - Free tier: 10k requests/day                                │
│    - Global replication                                         │
│    - TTL-based expiration                                       │
│                                                                  │
│  Cron (GitHub Actions):                                         │
│    - Scheduled workflow (3 AM UTC daily)                        │
│    - Manual trigger available                                   │
│    - Execution logs stored                                      │
│    - Retry on failure (3 attempts)                              │
└──────────────────────────────────────────────────────────────────┘
```

**Environment Separation:**

| Environment | Backend | Frontend | Database | Redis | Telegram |
|------------|---------|----------|----------|-------|----------|
| **Development** | localhost:3001 | localhost:3000 | Supabase Dev | Upstash Dev | Test Bot |
| **Production** | railway.app | vercel.app | Supabase Prod | Upstash Prod | Prod Bot |

**Scaling Strategy:**

- **0-1k users**: Single backend instance, minimal resources
- **1k-10k users**: Scale backend horizontally (2-3 instances), connection pooling critical
- **10k-100k users**: Add Redis cluster, optimize queries, implement aggressive caching
- **100k+ users**: Extract microservices (bot service, API service, worker service)

---

## 2. API Contract Specifications

### 2.1 Public Endpoints

#### POST /api/verify

Verify Solana wallet signature and check FairScore.

**Request:**
```json
{
  "telegramId": "123456789",
  "publicKey": "7xKzV8qF3mN2pL9rH4sT6jW8kX1yZ5uA3bC9dE4fG7hJ",
  "signature": [12, 34, 56, 78, ...],
  "message": "Sign in to Alpha Groups\n\nURI: https://alpha-groups.vercel.app\nIssued At: 2026-02-16T10:30:00.000Z\nNonce: abc123def456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "fairscore": 650,
  "tier": "silver",
  "message": "Wallet verified! You've been granted access to the group."
}
```

**Failure Response - Score Too Low (200):**
```json
{
  "success": false,
  "error": "Score below threshold",
  "fairscore": 250,
  "required": 300,
  "tier": "none"
}
```

**Error Response - Invalid Signature (400):**
```json
{
  "success": false,
  "error": "Invalid signature"
}
```

**Error Response - Server Error (500):**
```json
{
  "success": false,
  "error": "Internal server error",
  "details": "FairScale API timeout"
}
```

#### GET /api/health

Health check endpoint for monitoring.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-02-16T10:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "telegram": "connected"
  },
  "version": "1.0.0"
}
```

### 2.2 Admin Endpoints

All admin endpoints require JWT authentication.

**Authentication Header:**
```
Authorization: Bearer <jwt_token>
```

#### GET /api/admin/members

Get all members of a group with pagination and filtering.

**Query Parameters:**
- `groupId` (required): UUID of the group
- `page` (optional): Page number, default 1
- `limit` (optional): Items per page, default 50, max 100
- `search` (optional): Search by username or wallet address
- `tier` (optional): Filter by tier (bronze|silver|gold)
- `sortBy` (optional): Sort field (fairscore|joined_at|last_checked)
- `sortOrder` (optional): Sort direction (asc|desc)

**Response (200):**
```json
{
  "members": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "telegram_id": 123456789,
      "telegram_username": "cryptouser",
      "wallet_address": "7xKzV8qF3mN2pL9rH4sT6jW8kX1yZ5uA3bC9dE4fG7hJ",
      "fairscore": 650,
      "tier": "silver",
      "last_checked": "2026-02-16T10:30:00.000Z",
      "joined_at": "2026-02-10T08:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 247,
    "page": 1,
    "limit": 50,
    "totalPages": 5
  }
}
```

#### POST /api/admin/settings

Update group settings and thresholds.

**Request:**
```json
{
  "groupId": "550e8400-e29b-41d4-a716-446655440000",
  "bronzeThreshold": 350,
  "silverThreshold": 550,
  "goldThreshold": 750,
  "autoKickEnabled": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid threshold values - must be ascending"
}
```

#### POST /api/admin/kick

Manually kick a member from the group.

**Request:**
```json
{
  "groupId": "550e8400-e29b-41d4-a716-446655440000",
  "memberId": "550e8400-e29b-41d4-a716-446655440001",
  "reason": "Manual removal by admin"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Member kicked successfully"
}
```

#### GET /api/admin/analytics

Get analytics and statistics for a group.

**Query Parameters:**
- `groupId` (required): UUID of the group
- `period` (optional): Time period (7d|30d|90d), default 30d

**Response (200):**
```json
{
  "totalMembers": 247,
  "avgScore": 580.5,
  "medianScore": 565,
  "tierDistribution": {
    "bronze": 90,
    "silver": 112,
    "gold": 45
  },
  "scoreDistribution": [
    {"range": "0-200", "count": 0},
    {"range": "200-400", "count": 35},
    {"range": "400-600", "count": 125},
    {"range": "600-800", "count": 75},
    {"range": "800-1000", "count": 12}
  ],
  "recentActivity": [
    {
      "date": "2026-02-16",
      "verified": 12,
      "promoted": 5,
      "demoted": 2,
      "kicked": 1
    }
  ],
  "topMembers": [
    {
      "telegram_username": "whale_trader",
      "fairscore": 950,
      "tier": "gold"
    }
  ]
}
```

### 2.3 Cron Endpoint

#### POST /api/cron/recheck-members

Trigger daily member re-check (called by GitHub Actions).

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response (200):**
```json
{
  "success": true,
  "summary": {
    "total": 247,
    "checked": 247,
    "kicked": 5,
    "promoted": 12,
    "demoted": 3,
    "unchanged": 227
  },
  "executionTime": 12500,
  "timestamp": "2026-02-16T03:00:00.000Z"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Unauthorized - invalid CRON_SECRET"
}
```

---

## 3. Database Design

### 3.1 Schema Diagram

```
┌─────────────┐
│   groups    │
├─────────────┤
│ id (PK)     │◄─────┐
│ telegram_id │      │
│ name        │      │
│ bronze_th   │      │
│ silver_th   │      │
│ gold_th     │      │
│ auto_kick   │      │
└─────────────┘      │
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────┴────────┐       ┌────────┴────────┐
│    members     │       │  group_admins   │
├────────────────┤       ├─────────────────┤
│ id (PK)        │       │ group_id (FK)   │
│ group_id (FK)  │       │ admin_id (FK)   │
│ telegram_id    │       │ role            │
│ wallet_address │       └─────────────────┘
│ fairscore      │                │
│ tier           │                │
│ last_checked   │                │
└────────────────┘                │
        │                         │
        │                  ┌──────┴──────┐
        │                  │    admins   │
        │                  ├─────────────┤
        │                  │ id (PK)     │
        │                  │ email       │
        │                  │ password_h  │
        │                  └─────────────┘
        │
        ├─────────────────┐
        │                 │
┌───────┴────────┐  ┌─────┴─────────┐
│ activity_log   │  │ verifications │
├────────────────┤  ├───────────────┤
│ id (PK)        │  │ id (PK)       │
│ member_id (FK) │  │ telegram_id   │
│ action         │  │ wallet_addr   │
│ old_score      │  │ signature     │
│ new_score      │  │ message       │
│ details        │  │ nonce         │
└────────────────┘  └───────────────┘

     ┌────────────────┐
     │  used_nonces   │
     ├────────────────┤
     │ nonce (PK)     │
     │ telegram_id    │
     │ used_at        │
     └────────────────┘
```

### 3.2 Complete SQL Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_group_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255),
    bronze_threshold INT DEFAULT 300,
    silver_threshold INT DEFAULT 500,
    gold_threshold INT DEFAULT 700,
    auto_kick_enabled BOOLEAN DEFAULT true,
    recheck_frequency VARCHAR(50) DEFAULT 'daily',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members table
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    telegram_username VARCHAR(255),
    wallet_address VARCHAR(255) NOT NULL,
    fairscore INT,
    tier VARCHAR(50),
    last_checked TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, telegram_id)
);

-- Verifications table (audit log)
CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    signature TEXT NOT NULL,
    message TEXT NOT NULL,
    nonce VARCHAR(255) NOT NULL,
    verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admins table (dashboard authentication)
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Group admins junction table
CREATE TABLE group_admins (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, admin_id)
);

-- Activity log (debugging and analytics)
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    action VARCHAR(100),
    old_score INT,
    new_score INT,
    old_tier VARCHAR(50),
    new_tier VARCHAR(50),
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nonce tracking (prevent replay attacks)
CREATE TABLE used_nonces (
    nonce VARCHAR(255) PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Indexes (CRITICAL for Performance)

**Research Finding:** Index ALL columns used in RLS policies for 100x+ performance gain.

```sql
-- Groups indexes
CREATE INDEX idx_groups_telegram_id ON groups(telegram_group_id);

-- Members indexes (CRITICAL - most queried table)
CREATE INDEX idx_members_group_id ON members(group_id);
CREATE INDEX idx_members_wallet ON members(wallet_address);
CREATE INDEX idx_members_telegram_id ON members(telegram_id);
CREATE INDEX idx_members_tier ON members(tier);
CREATE INDEX idx_members_last_checked ON members(last_checked);
CREATE INDEX idx_members_group_tier ON members(group_id, tier); -- Composite index

-- Verifications indexes
CREATE INDEX idx_verifications_telegram_id ON verifications(telegram_id);
CREATE INDEX idx_verifications_wallet ON verifications(wallet_address);
CREATE INDEX idx_verifications_nonce ON verifications(nonce);
CREATE INDEX idx_verifications_verified_at ON verifications(verified_at DESC);

-- Admins indexes
CREATE INDEX idx_admins_email ON admins(email);

-- Group admins indexes
CREATE INDEX idx_group_admins_admin_id ON group_admins(admin_id);
CREATE INDEX idx_group_admins_group_id ON group_admins(group_id);

-- Activity log indexes
CREATE INDEX idx_activity_member_id ON activity_log(member_id);
CREATE INDEX idx_activity_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_action ON activity_log(action);

-- Nonce indexes
CREATE INDEX idx_used_nonces_used_at ON used_nonces(used_at);
```

### 3.4 Row Level Security (RLS) Policies

**Enable RLS on all tables:**

```sql
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_admins ENABLE ROW LEVEL SECURITY;

-- Helper function (performance optimization)
CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE;

-- Groups policies
CREATE POLICY "Admins can view their groups"
ON groups FOR SELECT
USING (id IN (SELECT group_id FROM group_admins WHERE admin_id = auth.current_user_id()));

CREATE POLICY "Admins can update their groups"
ON groups FOR UPDATE
USING (id IN (SELECT group_id FROM group_admins WHERE admin_id = auth.current_user_id()));

-- Members policies
CREATE POLICY "Admins can view members"
ON members FOR SELECT
USING (group_id IN (SELECT group_id FROM group_admins WHERE admin_id = auth.current_user_id()));

CREATE POLICY "Admins can manage members"
ON members FOR ALL
USING (group_id IN (SELECT group_id FROM group_admins WHERE admin_id = auth.current_user_id()));

-- Verifications policies
CREATE POLICY "Public can insert verifications"
ON verifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view verifications"
ON verifications FOR SELECT
USING (telegram_id IN (
  SELECT telegram_id FROM members
  WHERE group_id IN (SELECT group_id FROM group_admins WHERE admin_id = auth.current_user_id())
));

-- Activity log policies
CREATE POLICY "Admins can view activity"
ON activity_log FOR SELECT
USING (member_id IN (
  SELECT id FROM members
  WHERE group_id IN (SELECT group_id FROM group_admins WHERE admin_id = auth.current_user_id())
));

-- Admins policies
CREATE POLICY "Admins can view their own record"
ON admins FOR SELECT
USING (id = auth.current_user_id());

-- Group admins policies
CREATE POLICY "Admins can view their memberships"
ON group_admins FOR SELECT
USING (admin_id = auth.current_user_id());
```

### 3.5 Database Connection Strategy

**Use Supabase Connection Pooling (Port 6543):**

```typescript
// backend/src/db/client.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// Use port 6543 for connection pooling (critical for serverless)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: {
    schema: 'public'
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export { supabase };
```

**Connection String Format:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:6543/postgres?pgbouncer=true
```

---

## 4. Error Handling Strategy

### 4.1 Retry Logic with Exponential Backoff

**FairScale API Calls:**

```typescript
async function getFairScoreWithRetry(
  walletAddress: string,
  retries: number = 3
): Promise<number> {
  try {
    return await getFairScore(walletAddress);
  } catch (error) {
    if (retries > 0 && shouldRetry(error)) {
      const delay = Math.pow(2, 3 - retries) * 1000; // 2s, 4s, 8s
      await sleep(delay);
      return getFairScoreWithRetry(walletAddress, retries - 1);
    }
    throw error;
  }
}

function shouldRetry(error: any): boolean {
  return (
    error.code === 'ECONNABORTED' ||
    error.response?.status === 429 ||
    error.response?.status >= 500
  );
}
```

**Telegram API with p-queue (Rate Limiting):**

```typescript
import PQueue from 'p-queue';

// Individual chats: 1 msg/sec
const messageQueue = new PQueue({
  interval: 1000,
  intervalCap: 1
});

async function sendMessageSafe(chatId: number, message: string): Promise<void> {
  return messageQueue.add(async () => {
    try {
      await bot.sendMessage(chatId, message);
    } catch (error) {
      if (error.response?.statusCode === 429) {
        const retryAfter = error.response.parameters?.retry_after || 30;
        await sleep(retryAfter * 1000);
        return bot.sendMessage(chatId, message);
      }
      throw error;
    }
  });
}
```

### 4.2 Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private failureThreshold = 5;
  private timeout = 60000; // 1 minute
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = Date.now();

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}

const fairscaleCircuitBreaker = new CircuitBreaker();
```

### 4.3 Graceful Degradation

**FairScale API with Cache Fallback:**

```typescript
async function getFairScore(walletAddress: string): Promise<number> {
  try {
    const response = await axios.get(
      `${FAIRSCALE_API_URL}/v1/score/${walletAddress}`,
      {
        headers: { 'fairkey': FAIRSCALE_API_KEY },
        timeout: 5000
      }
    );
    return response.data.score || 0;
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.response?.status >= 500) {
      // Try cache fallback
      const cached = await redis.get(`fairscore:${walletAddress}`);
      if (cached) {
        logger.warn('FairScale API timeout/error - using cached score');
        return JSON.parse(cached).score;
      }
      logger.error('FairScale API error - no cache available');
      return 0; // Deny access for security
    }

    if (error.response?.status === 404) {
      return 0; // New wallet, no history
    }

    logger.error('FairScale API error:', error);
    return 0;
  }
}
```

### 4.4 User-Facing Error Messages

```typescript
const ERROR_MESSAGES = {
  INVALID_SIGNATURE: 'Signature verification failed. Please try again.',
  SCORE_TOO_LOW: 'Your FairScore is below the minimum threshold. Build your on-chain reputation and try again.',
  FAIRSCALE_TIMEOUT: 'Unable to verify reputation at this time. Please try again in a few minutes.',
  FAIRSCALE_ERROR: 'Reputation service is temporarily unavailable. Please try again later.',
  TELEGRAM_ERROR: 'Unable to grant access. Please contact an admin.',
  DATABASE_ERROR: 'An error occurred. Please try again.',
  RATE_LIMIT: 'Too many requests. Please wait and try again.',
  NONCE_REUSE: 'This signature has already been used. Please refresh and try again.'
};

function getUserFriendlyError(error: Error): string {
  // Map internal errors to user-friendly messages
  // Never expose internal implementation details
  if (error.message.includes('signature')) return ERROR_MESSAGES.INVALID_SIGNATURE;
  if (error.message.includes('FairScale')) return ERROR_MESSAGES.FAIRSCALE_ERROR;
  if (error.message.includes('nonce')) return ERROR_MESSAGES.NONCE_REUSE;
  return 'An unexpected error occurred. Please try again or contact support.';
}
```

### 4.5 Logging and Monitoring

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log verification attempts
logger.info('Verification attempt', {
  telegramId,
  walletAddress: walletAddress.substring(0, 8) + '...',
  fairscore,
  tier,
  success: true
});

// Log errors with context
logger.error('FairScale API error', {
  walletAddress: walletAddress.substring(0, 8) + '...',
  error: error.message,
  statusCode: error.response?.status
});
```

**Monitoring Alerts (Set Up in Production):**
- Signature verification failure rate > 10%
- FairScale API error rate > 5%
- Telegram API 429 errors
- Database query time > 1 second (p95)
- Circuit breaker opens

---

## 5. Security Architecture

### 5.1 Sign In With Solana (SIWS) Implementation

**Research Finding:** Use SIWS instead of raw signMessage for better security. Wallets construct the message, preventing malicious injection.

**Frontend (Next.js):**

```typescript
import { useWallet } from '@solana/wallet-adapter-react';

const { publicKey, signIn } = useWallet();

// Use SIWS (Sign In With Solana)
const signInData = await signIn({
  domain: 'alpha-groups.vercel.app',
  statement: 'Verify your wallet to access reputation-gated communities',
  uri: 'https://alpha-groups.vercel.app',
  version: '1',
  chainId: 'mainnet',
  nonce: crypto.randomUUID(),
  issuedAt: new Date().toISOString()
});

// Send to backend
await fetch('/api/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    telegramId,
    publicKey: publicKey.toString(),
    signature: Array.from(signInData.signature),
    message: signInData.signedMessage
  })
});
```

**Backend (Node.js):**

```typescript
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';

export async function verifySIWS(
  publicKeyStr: string,
  message: string,
  signatureArray: number[],
  telegramId: string
): Promise<boolean> {
  try {
    // 1. Parse SIWS message
    const parsed = parseSIWSMessage(message);

    // 2. Verify timestamp (±10 minutes)
    const issuedAt = new Date(parsed.issuedAt).getTime();
    const now = Date.now();
    if (Math.abs(now - issuedAt) > 10 * 60 * 1000) {
      logger.warn('SIWS message expired');
      return false;
    }

    // 3. Check nonce not used (prevent replay attacks)
    const nonceExists = await supabase
      .from('used_nonces')
      .select('nonce')
      .eq('nonce', parsed.nonce)
      .single();

    if (nonceExists.data) {
      logger.warn('Nonce reuse detected - replay attack');
      return false;
    }

    // 4. Verify signature cryptographically
    const publicKey = new PublicKey(publicKeyStr);
    const publicKeyBytes = publicKey.toBytes();
    const messageBytes = new TextEncoder().encode(message);
    const signature = new Uint8Array(signatureArray);

    const valid = nacl.sign.detached.verify(
      messageBytes,
      signature,
      publicKeyBytes
    );

    if (!valid) {
      logger.warn('Invalid signature');
      return false;
    }

    // 5. Store nonce
    await supabase.from('used_nonces').insert({
      nonce: parsed.nonce,
      telegram_id: telegramId
    });

    return true;
  } catch (error) {
    logger.error('SIWS verification error:', error);
    return false;
  }
}
```

### 5.2 Telegram Webhook Security

**Research Finding:** 97% of bots skip webhook secret verification - this is critical!

**Set Webhook with Secret:**

```typescript
await bot.setWebHook('https://alpha-groups-api.railway.app/webhook', {
  secret_token: process.env.TELEGRAM_SECRET_TOKEN, // 32+ random chars
  drop_pending_updates: true
});
```

**Verify Secret on Every Request:**

```typescript
app.post('/webhook', (req, res) => {
  const receivedToken = req.headers['x-telegram-bot-api-secret-token'];

  if (receivedToken !== process.env.TELEGRAM_SECRET_TOKEN) {
    logger.error('Invalid webhook secret - potential attack!');
    return res.status(403).send('Forbidden');
  }

  // Process update
  bot.processUpdate(req.body);
  res.sendStatus(200);
});
```

### 5.3 JWT Authentication for Admin Dashboard

**Token Generation:**

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

function generateToken(adminId: string, email: string): string {
  return jwt.sign(
    { adminId, email, type: 'admin' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
```

**Verification Middleware:**

```typescript
export function authenticateAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization' });
    return;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    if (decoded.type !== 'admin') {
      res.status(403).json({ error: 'Invalid token type' });
      return;
    }

    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

### 5.4 Rate Limiting

**API Rate Limiting:**

```typescript
import rateLimit from 'express-rate-limit';

// Global limiter (100 req/15min per IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

// Verification endpoint (10 req/hour per IP)
const verifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many verification attempts'
});

app.use('/api/', globalLimiter);
app.use('/api/verify', verifyLimiter);
```

### 5.5 CORS Configuration

```typescript
import cors from 'cors';

const ALLOWED_ORIGINS = [
  'https://alpha-groups.vercel.app',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 5.6 Input Validation

**Using Zod for Type-Safe Validation:**

```typescript
import { z } from 'zod';

const VerifyRequestSchema = z.object({
  telegramId: z.string().regex(/^\d+$/),
  publicKey: z.string().length(44),
  signature: z.array(z.number().min(0).max(255)).length(64),
  message: z.string().min(50).max(500)
});

router.post('/api/verify', async (req, res) => {
  try {
    const validated = VerifyRequestSchema.parse(req.body);
    // Proceed with validated data
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input' });
  }
});
```

### 5.7 Secrets Management

**Environment Variables (.env):**

```bash
# Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...  # NEVER EXPOSE

# Telegram
TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
TELEGRAM_SECRET_TOKEN=random_32_char_string

# FairScale
FAIRSCALE_API_KEY=your_api_key_here

# Redis
REDIS_URL=redis://default:password@host:6379

# Security
JWT_SECRET=random_jwt_secret
CRON_SECRET=random_cron_secret

# App
FRONTEND_URL=https://alpha-groups.vercel.app
NODE_ENV=production
```

**Best Practices:**
- ✅ Never commit .env to git (add to .gitignore)
- ✅ Use different secrets for dev/staging/prod
- ✅ Rotate secrets every 6 months
- ✅ Use Railway/Render environment variables in production
- ✅ Never log secrets

---

## 6. Redis Caching Strategy

**Research Finding:** Cache FairScale scores with appropriate TTL to reduce API costs and improve performance.

### 6.1 Cache-Aside Pattern

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getFairScoreWithCache(walletAddress: string, tier?: string): Promise<number> {
  const cacheKey = `fairscore:${walletAddress}`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    logger.info('Cache hit for FairScore');
    return JSON.parse(cached).score;
  }

  // 2. Fetch from API
  const score = await getFairScore(walletAddress);

  // 3. Store with TTL (tier-based)
  const ttl = getTTLForTier(tier, score);
  await redis.setex(cacheKey, ttl, JSON.stringify({ score, cached_at: Date.now() }));

  return score;
}

function getTTLForTier(tier?: string, score?: number): number {
  // Higher scores are more stable, cache longer
  if (score && score >= 700) return 6 * 3600; // 6 hours (gold tier)
  if (score && score >= 500) return 3 * 3600; // 3 hours (silver tier)
  return 1 * 3600; // 1 hour (bronze/new users)
}
```

### 6.2 Cache Invalidation

```typescript
async function invalidateFairScoreCache(walletAddress: string): Promise<void> {
  await redis.del(`fairscore:${walletAddress}`);
  logger.info('Cache invalidated for wallet:', walletAddress.substring(0, 8));
}

// Invalidate after manual re-check
async function manualRecheck(memberId: string): Promise<void> {
  const member = await supabase.from('members').select('*').eq('id', memberId).single();
  await invalidateFairScoreCache(member.data.wallet_address);
  const newScore = await getFairScore(member.data.wallet_address);
  await updateMemberScore(memberId, newScore);
}
```

---

## 7. Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14, React, TypeScript | Server-side rendering, wallet integration |
| **UI Components** | Tailwind CSS, shadcn/ui | Styling and UI components |
| **Wallet Integration** | @solana/wallet-adapter | Phantom, Solflare, Backpack support |
| **Backend** | Node.js, Express, TypeScript | API server and bot logic |
| **Telegram Bot** | node-telegram-bot-api | Bot framework |
| **Database** | Supabase (PostgreSQL) | Data persistence, RLS |
| **Caching** | Redis (Upstash) | FairScale score caching |
| **Signature Verification** | tweetnacl, @solana/web3.js | Ed25519 cryptography |
| **Validation** | Zod | Type-safe input validation |
| **Authentication** | JWT (jsonwebtoken) | Admin dashboard auth |
| **Rate Limiting** | p-queue, express-rate-limit | Prevent abuse |
| **Logging** | Winston | Structured logging |
| **Cron Jobs** | GitHub Actions | Daily member re-checks |
| **Hosting (Frontend)** | Vercel | Serverless deployment |
| **Hosting (Backend)** | Railway or Render | Container deployment |

---

## 8. Implementation Checklist

### Phase 1: Backend Core (backend-dev)
- [ ] Initialize Node.js + TypeScript + Express project
- [ ] Set up Supabase client with connection pooling (port 6543)
- [ ] Set up Redis client (Upstash)
- [ ] Implement SIWS signature verification service
- [ ] Implement FairScale API client with circuit breaker
- [ ] Implement Redis caching layer
- [ ] Create verification API endpoint (POST /api/verify)
- [ ] Set up Telegram bot with webhooks
- [ ] Implement bot command handlers (/start, /verify, /status)
- [ ] Create daily re-check service
- [ ] Create cron endpoint (POST /api/cron/recheck-members)

### Phase 2: Admin API (backend-dev)
- [ ] Implement JWT authentication middleware
- [ ] Create admin endpoints (members, settings, kick, analytics)
- [ ] Implement input validation with Zod
- [ ] Add rate limiting
- [ ] Configure CORS
- [ ] Set up error handling and logging

### Phase 3: Frontend (frontend-dev)
- [ ] Initialize Next.js 14 project
- [ ] Set up Solana wallet adapter
- [ ] Implement verification page with SIWS
- [ ] Implement admin login page
- [ ] Implement admin dashboard home
- [ ] Implement member list page with search/filter
- [ ] Implement settings page
- [ ] Implement analytics page
- [ ] Connect to backend API

### Phase 4: Database (manual or backend-dev)
- [ ] Create Supabase project
- [ ] Run SQL schema migrations
- [ ] Create indexes
- [ ] Set up RLS policies
- [ ] Create initial admin user
- [ ] Test database connection

### Phase 5: Deployment
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Set up GitHub Actions cron
- [ ] Configure all environment variables
- [ ] Test end-to-end flow
- [ ] Set up monitoring and alerts

---

## 9. Critical Files

**Backend:**
- `backend/src/index.ts` - Express server, webhook endpoint
- `backend/src/services/solana-verify.ts` - SIWS verification
- `backend/src/services/fairscale.ts` - FairScale API client
- `backend/src/services/redis.ts` - Redis cache client
- `backend/src/services/member-checker.ts` - Daily re-check logic
- `backend/src/bot/telegram-bot.ts` - Bot setup
- `backend/src/bot/handlers.ts` - Command handlers
- `backend/src/api/routes/verify.ts` - Verification endpoint
- `backend/src/api/routes/admin.ts` - Admin endpoints
- `backend/src/api/routes/cron.ts` - Cron endpoint
- `backend/src/api/middleware/auth.ts` - JWT middleware
- `backend/src/db/client.ts` - Supabase client
- `backend/package.json` - Dependencies
- `backend/.env.example` - Env template

**Frontend:**
- `frontend/app/layout.tsx` - Wallet provider
- `frontend/app/verify/page.tsx` - Verification page
- `frontend/app/admin/page.tsx` - Dashboard home
- `frontend/app/admin/members/page.tsx` - Member list
- `frontend/app/admin/settings/page.tsx` - Settings
- `frontend/components/WalletConnect.tsx` - Wallet button
- `frontend/lib/api.ts` - API client
- `frontend/package.json` - Dependencies

**CI/CD:**
- `.github/workflows/daily-recheck.yml` - Daily cron job

---

## 10. Testing Strategy

**End-to-End Verification:**
1. User sends /verify in Telegram
2. Opens verification link
3. Connects Phantom wallet
4. Signs SIWS message
5. Backend verifies signature
6. FairScore fetched and cached
7. User granted/denied access
8. Notification sent

**Daily Re-check:**
1. GitHub Actions triggers at 3 AM UTC
2. All members re-checked
3. Tier changes processed
4. Notifications sent

**Security Tests:**
1. Webhook secret verification
2. SIWS nonce replay protection
3. JWT expiration
4. RLS policies
5. Rate limiting

---

## Conclusion

This architecture provides a production-ready, secure, and scalable foundation for Alpha Groups. It implements all critical research findings while remaining achievable within the hackathon timeline. The monolithic approach allows rapid development while the well-structured design enables future scaling and microservices extraction if needed.

**Next Steps:**
1. Backend developer begins implementation following this architecture
2. Frontend developer begins implementation following this architecture
3. Both teams coordinate on API contracts and data models
4. Testing and deployment
