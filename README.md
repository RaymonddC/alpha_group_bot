# Alpha Groups

**Reputation-gated Telegram communities powered by FairScale on-chain reputation.**

Alpha Groups is a Telegram bot that automatically manages community access based on members' FairScore — Solana's on-chain reputation metric (0–1000). Users verify their wallet via Sign In With Solana (SIWS), get scored, and receive tiered access. Admins control everything through a web dashboard.

> Built for Fairathon 2026

---

## Live Demo

| | |
|---|---|
| **App** | https://alpha-groups.vercel.app |
| **Backend** | https://alpha-groups-backend.railway.app |
| **Demo Video** | [YouTube / Loom link] |

---

## The Problem

Alpha investment groups on Telegram are flooded with bots, scammers, and low-quality members. Manual vetting doesn't scale. Traditional access control (invite links, paid subscriptions) is gameable and gives no signal about actual on-chain credibility.

## The Solution

Use **on-chain reputation as the gatekeeper**. Alpha Groups connects FairScale's FairScore directly to Telegram group membership:

- No FairScore → No access
- Score drops → Auto-kick
- Score rises → Auto-promote to higher tier
- Admins set their own thresholds

---

## FairScale Integration

FairScore is not a feature in Alpha Groups — it **is** the product. Every access control decision flows through it:

### 1. Wallet Verification Flow
```
User signs SIWS message with Phantom/Solflare
    → Backend verifies signature cryptographically
    → Backend calls FairScale API: GET /fairScore?wallet=<address>
    → FairScore determines tier (Bronze/Silver/Gold)
    → Telegram bot grants/denies group access
```

### 2. Daily Re-check (Automated)
```
GitHub Actions triggers POST /api/cron/recheck-members at 3AM UTC
    → Fetches all active members' wallets in batches of 10
    → Re-queries FairScale API for updated scores
    → Auto-promotes, demotes, or kicks based on score changes
    → Sends Telegram notifications for tier changes
```

### 3. Resilient API Client (`backend/src/services/fairscale.ts`)
- **Circuit breaker** — opens after 5 consecutive failures, retries after 60s
- **Exponential backoff** — retries on 429/5xx with 2s → 4s → 8s delays
- **Redis cache** — score cached by tier (Bronze: 1h, Silver: 3h, Gold: 6h)
- **Cache fallback** — serves stale score if API is unreachable during re-check

### 4. Tier Thresholds (Admin-configurable)

| Tier | Default Threshold | Access Level |
|------|------------------|--------------|
| Bronze | 300+ | Entry level |
| Silver | 500+ | Trusted member |
| Gold | 700+ | Elite access |
| Below Bronze | < 300 | Auto-kicked |

---

## Features

- **Wallet Verification** — Cryptographic SIWS signature verification, gasless, non-custodial
- **Tiered Access** — Three reputation tiers with admin-configurable thresholds
- **Auto-Management** — Daily cron re-checks all members, kicks/promotes automatically
- **Bot Commands** — `/start`, `/verify`, `/status`, `/help` in Telegram
- **Admin Dashboard** — Members table, analytics charts, activity log, settings
- **Nonce Replay Protection** — Each SIWS message is single-use (stored in DB)
- **Rate Limiting** — Global (100 req/15min), verify endpoint (10 req/hr)
- **Security Headers** — CSP, X-Frame-Options, Referrer-Policy on all responses

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Users                                  │
│  Telegram App          Browser (verify page)                  │
└──────┬────────────────────────┬────────────────────────────── ┘
       │ /start /verify          │ Connect wallet + sign
       ▼                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Express Backend (Railway)                        │
│                                                               │
│  /webhook ──► telegram-bot.ts ──► handlers.ts                │
│  /api/verify ──► solana-verify.ts ──► fairscale.ts           │
│  /api/admin/* ──► auth middleware ──► admin routes           │
│  /api/cron/recheck ──► member-checker.ts                     │
└──────┬──────────────────┬──────────────────┬─────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────┐    ┌──────────────┐    ┌─────────────────┐
│ Supabase │    │  FairScale   │    │  Redis (Upstash) │
│(Postgres)│    │     API      │    │   Score Cache    │
└──────────┘    └──────────────┘    └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Next.js Frontend (Vercel)                        │
│                                                               │
│  /verify ──── Wallet connect + SIWS sign                     │
│  /admin/* ─── Dashboard, Members, Analytics, Settings        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions — Daily cron at 3AM UTC                      │
│  POST /api/cron/recheck-members                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + TypeScript + Express |
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Cache | Redis (Upstash) |
| Blockchain | Solana — @solana/web3.js + tweetnacl |
| Wallet Adapter | @solana/wallet-adapter-react |
| Bot | node-telegram-bot-api |
| Charts | Recharts |
| Auth | JWT (7d expiry) + bcrypt |
| CI/CD | GitHub Actions |
| Hosting | Railway (backend) + Vercel (frontend) |

---

## Local Setup

### Prerequisites
- Node.js 18+
- Docker (for local PostgreSQL + Redis)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

### 1. Clone & install
```bash
git clone https://github.com/fairscale/alpha-groups
cd alpha-groups

cd backend && npm install
cd ../frontend && npm install
```

### 2. Start local services
```bash
docker compose up -d
# Starts PostgreSQL 15 on :5432 and Redis 7 on :6379
# Migrations run automatically on first start
```

### 3. Configure environment

**Backend** (`backend/.env`):
```env
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_SECRET_TOKEN=any_random_32_char_string

FAIRSCALE_API_KEY=your_fairscale_api_key
FAIRSCALE_API_URL=https://api.fairscale.xyz

REDIS_URL=redis://localhost:6379
JWT_SECRET=any_random_secret
CRON_SECRET=any_random_secret

FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=3001
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### 4. Run
```bash
# Terminal 1 — Backend (hot reload)
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Admin login: admin@alphagroups.xyz / admin123

---

## Production Deployment

### Backend (Railway)

1. Connect your GitHub repo to [Railway](https://railway.app)
2. Set root directory to `backend/`
3. Add environment variables:

```env
NODE_ENV=production
BACKEND_URL=https://your-app.railway.app   # Your Railway URL
TELEGRAM_SECRET_TOKEN=<random 32 chars>

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

TELEGRAM_BOT_TOKEN=your_bot_token
FAIRSCALE_API_KEY=your_api_key
FAIRSCALE_API_URL=https://api.fairscale.xyz

REDIS_URL=rediss://default:password@your-db.upstash.io:6379
JWT_SECRET=<random secret>
CRON_SECRET=<random secret>

FRONTEND_URL=https://your-frontend.vercel.app
PORT=3001
```

Setting `NODE_ENV=production` automatically switches the Telegram bot from polling to **webhook mode** — no additional configuration needed.

### Frontend (Vercel)

```bash
cd frontend
vercel --prod
```

Set environment variable:
```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
```

### Database Migrations (Supabase)

Run migrations in order against your production Supabase project:
```bash
for f in backend/migrations/*.sql; do
  psql "$DATABASE_URL" < "$f"
done
```

Or paste each file into the Supabase SQL Editor in order (001 → 008).

### GitHub Actions Cron

Add these secrets to your GitHub repository (`Settings → Secrets`):

| Secret | Value |
|--------|-------|
| `BACKEND_URL` | `https://your-backend.railway.app` |
| `CRON_SECRET` | Same value as backend `CRON_SECRET` |

The daily re-check runs at 3AM UTC automatically.

---

## API Reference

### Authentication
All admin endpoints require a JWT in the `Authorization: Bearer <token>` header.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/verify` | Verify Solana wallet + grant Telegram access |
| `GET` | `/api/health` | Health check (DB, Redis, Telegram status) |
| `POST` | `/api/admin/login` | Admin login → JWT |
| `GET` | `/api/admin/members` | List members (paginated, filterable) |
| `DELETE` | `/api/admin/members/:id` | Kick a member |
| `GET` | `/api/admin/analytics` | Dashboard analytics |
| `GET` | `/api/admin/activity` | Activity log |
| `GET` | `/api/admin/settings` | Get group settings |
| `PUT` | `/api/admin/settings` | Update tier thresholds + auto-kick |
| `POST` | `/api/cron/recheck-members` | Trigger member re-check (cron secret required) |
| `POST` | `/webhook` | Telegram webhook (secret token required) |

### Verify Endpoint
```bash
POST /api/verify
Content-Type: application/json

{
  "walletAddress": "So11111111111111111111111111111111111111112",
  "message": "alpha-groups.vercel.app wants you to sign in...",
  "signature": [1, 2, 3, ...],
  "telegramId": "123456789",
  "groupId": "uuid-of-group"
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | From @BotFather |
| `TELEGRAM_SECRET_TOKEN` | Yes (prod) | Webhook security token |
| `BACKEND_URL` | Yes (prod) | Public URL of this backend |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `FAIRSCALE_API_KEY` | Yes | FairScale API key |
| `FAIRSCALE_API_URL` | Yes | FairScale API base URL |
| `REDIS_URL` | Yes | Redis connection URL |
| `JWT_SECRET` | Yes | Secret for signing admin JWTs |
| `CRON_SECRET` | Yes | Secret for cron endpoint |
| `FRONTEND_URL` | Yes | Frontend URL (for CORS) |
| `NODE_ENV` | Yes | `development` or `production` |

---

## Testing

```bash
cd backend

# Unit tests
npm test

# Integration tests (requires Docker services running)
npm run test:integration

# Type check
npx tsc --noEmit
```

Test coverage includes:
- SIWS signature verification + nonce replay prevention
- FairScore circuit breaker (CLOSED → OPEN → HALF_OPEN)
- Member-checker promotion/demotion/kick logic
- Admin auth middleware (JWT validation)
- All API route validation (Zod schemas)

---

## Project Structure

```
alpha-groups/
├── backend/
│   ├── src/
│   │   ├── bot/
│   │   │   ├── telegram-bot.ts      # Bot init, webhook/polling, exports
│   │   │   ├── handlers.ts          # /start /verify /status /help
│   │   │   ├── notifications.ts     # User notification messages
│   │   │   └── rate-limiter.ts      # 1 msg/sec p-queue
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── verify.ts        # POST /api/verify
│   │   │   │   ├── admin.ts         # All /api/admin/* routes
│   │   │   │   ├── cron.ts          # POST /api/cron/recheck-members
│   │   │   │   └── health.ts        # GET /api/health
│   │   │   └── middleware/
│   │   │       ├── auth.ts          # JWT middleware
│   │   │       ├── validation.ts    # Zod request validation
│   │   │       └── error-handler.ts # Global error handler
│   │   ├── services/
│   │   │   ├── fairscale.ts         # FairScore API + circuit breaker
│   │   │   ├── solana-verify.ts     # SIWS signature verification
│   │   │   ├── redis.ts             # Cache-aside pattern
│   │   │   ├── member-checker.ts    # Daily re-check logic
│   │   │   └── logger.ts            # Winston logger
│   │   ├── db/client.ts             # Supabase client
│   │   ├── types/index.ts           # All TypeScript interfaces
│   │   └── index.ts                 # Express entry point
│   └── migrations/                  # SQL migration files (001-008)
├── frontend/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── verify/page.tsx          # Wallet verification flow
│   │   └── admin/                   # Dashboard pages
│   ├── components/                  # Reusable UI components
│   └── lib/
│       ├── api.ts                   # All backend API calls
│       └── utils.ts                 # Helpers
├── docs/                            # Architecture & spec docs
├── .github/workflows/               # GitHub Actions cron
└── docker-compose.yml               # Local dev services
```

---

## Team

| Name | Role | Contact |
|------|------|---------|
| [Your Name] | Full-stack Developer | [@handle] |

---

## License

MIT
