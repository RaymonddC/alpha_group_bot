# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alpha Groups — a reputation-gated Telegram bot that manages community access based on FairScale's on-chain reputation (FairScore 0-1000) on Solana. Users verify their Solana wallet via SIWS (Sign In With Solana), get scored, and are assigned tiers (Bronze 300+, Silver 500+, Gold 700+) that determine group access.

**Stack**: Express + TypeScript backend, Next.js 14 frontend, Supabase (PostgreSQL), Redis, Solana Web3.js, node-telegram-bot-api.

## Development Commands

### Local Setup
```bash
docker compose up -d                    # PostgreSQL 15 + Redis 7 (auto-runs migrations)
# If DB is empty after startup, wipe volume: docker compose down -v && docker compose up -d

cp backend/.env.example backend/.env    # Fill in TELEGRAM_BOT_TOKEN at minimum
cp frontend/.env.example frontend/.env.local
```

### Backend (`backend/`)
```bash
npm run dev       # nodemon + ts-node (hot reload, port 3001)
npm run build     # tsc → dist/
npm start         # node dist/index.js
npx tsc --noEmit  # type-check without emitting
```

### Frontend (`frontend/`)
```bash
npm run dev       # Next.js dev server (port 3000)
npm run build     # production build
npm run lint      # ESLint
```

### Database Migrations
Migrations auto-run on first `docker compose up` via PostgreSQL's `docker-entrypoint-initdb.d`. To re-run:
```bash
docker compose down -v && docker compose up -d
```
Or manually: `docker exec -i alpha_groups_db psql -U postgres -d alpha_groups < backend/migrations/001_initial_schema.sql`

## Architecture

### Request Flow
```
Telegram → /webhook (Express) → telegram-bot.ts → handlers.ts
Browser  → Next.js /verify    → POST /api/verify → solana-verify.ts → fairscale.ts → DB
Admin    → Next.js /admin/*   → /api/admin/*     → auth middleware  → DB
GitHub Actions (3AM UTC)       → POST /api/cron/recheck-members     → member-checker.ts
```

### Backend Structure (`backend/src/`)
- **`index.ts`** — Express entry point. Initializes bot functions via dynamic import with mock fallbacks (so server runs without bot token).
- **`bot/`** — Telegram bot. `telegram-bot.ts` exports `grantTelegramAccess`, `kickMember`, `notifyUser`, `testTelegramConnection`. `handlers.ts` registers /start, /verify, /status, /help commands. `rate-limiter.ts` uses p-queue (1 msg/sec).
- **`api/routes/`** — Express routers. Each route file has `setBotFunctions()` called from `index.ts` to inject bot capabilities without circular imports.
- **`api/middleware/`** — `auth.ts` (JWT, 7d expiry), `validation.ts` (Zod schemas), `error-handler.ts` (global handler + `asyncHandler` wrapper).
- **`services/`** — `fairscale.ts` (circuit breaker: 5 failures → OPEN 60s, exponential backoff), `solana-verify.ts` (SIWS + nonce replay prevention), `redis.ts` (cache-aside, TTL by score: 1h/3h/6h), `member-checker.ts` (daily re-check logic).
- **`db/client.ts`** — Supabase client initialization.
- **`types/index.ts`** — All TypeScript interfaces and error message constants.

### Frontend Structure (`frontend/`)
- **App Router** (`app/`) — `page.tsx` (landing), `verify/page.tsx` (wallet verification), `admin/` (dashboard, members, settings, analytics, login).
- **`components/`** — WalletConnect, MemberTable, ScoreChart, TierBadge, StatCard, Sidebar.
- **`lib/api.ts`** — Fetch wrapper with JWT from localStorage. All API calls defined here.

### Bot Function Injection Pattern
Bot functions (`grantTelegramAccess`, `kickMember`, `notifyUser`) are dynamically imported in `index.ts` and injected into route files and services via `setBotFunctions()`. If the bot module fails to load (no token), mock functions are used instead. This avoids circular dependencies and lets the API server run without a bot token.

## Key Patterns

### TypeScript Strictness
`tsconfig.json` has `strict: true`, `noUnusedLocals`, `noUnusedParameters`. Prefix unused params with `_` (e.g., `_req`, `_next`). Express error handlers must keep all 4 params for Express to recognize them.

### Validation
All API inputs validated with Zod schemas in `validation.ts`. Use `validateRequest()` for body, `validateQuery()` for query params. Threshold validation enforces `bronze < silver < gold`.

### Caching (Redis)
Cache-aside pattern in `redis.ts`. FairScore TTL is tier-based: Gold (≥700) = 6h, Silver (≥500) = 3h, Bronze = 1h. Use `getFairScoreFromCache` / `setFairScoreCache`.

### Circuit Breaker (FairScale API)
In `fairscale.ts`: CLOSED → OPEN after 5 failures (60s cooldown) → HALF_OPEN (test request) → CLOSED on success. Always check cache before API call.

### Database
7 tables: `groups`, `members`, `verifications`, `admins`, `group_admins`, `activity_log`, `used_nonces`. Migrations in `backend/migrations/` (001-005). RLS policies applied. Unique constraint on `(group_id, telegram_id)` for members.

### Environment
- **Backend requires**: `TELEGRAM_BOT_TOKEN` (runtime), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `REDIS_URL`, `JWT_SECRET`
- **For local dev**: `REDIS_URL=redis://localhost:6379`, `FRONTEND_URL=http://localhost:3000`
- **Frontend requires**: `NEXT_PUBLIC_BACKEND_URL=http://localhost:3001`

### Design System (Frontend)
Dark OLED theme (#0F172A background), gold #F59E0B + purple #8B5CF6 accents, Orbitron headings + Exo 2 body fonts, Lucide icons only. See `design-system/alphagroups/MASTER.md`.
