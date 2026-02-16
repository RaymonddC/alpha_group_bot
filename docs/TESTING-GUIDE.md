# Alpha Groups - Testing Guide (Windows)

## Prerequisites

Before testing, ensure you have installed on Windows:

- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **Docker Desktop for Windows** ([docker.com](https://www.docker.com/products/docker-desktop/))
- **Git** ([git-scm.com](https://git-scm.com))
- A **Telegram account** (for bot testing)
- A **Solana wallet** browser extension (Phantom or Solflare)

> All commands below are for **PowerShell** or **Command Prompt (cmd)**.

### External Service Accounts (needed for full testing)

| Service | Purpose | Get Access |
|---------|---------|------------|
| **Telegram Bot** | Bot token | Message [@BotFather](https://t.me/BotFather) on Telegram, send `/newbot` |
| **FairScale API** | FairScore lookups | Sign up at https://sales.fairscale.xyz/ |
| **Supabase** (production only) | Managed PostgreSQL | https://supabase.com (free tier) |
| **Upstash** (production only) | Managed Redis | https://upstash.com (free tier) |

> For local development, Docker provides PostgreSQL and Redis - no Supabase/Upstash needed.

---

## Step 1: Clone and Install

```powershell
# Clone the repo
git clone <your-repo-url>
cd alpha_group_bot

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ..\frontend
npm install

# Return to project root
cd ..
```

---

## Step 2: Start Local Database (Docker)

Make sure **Docker Desktop** is running, then:

```powershell
# Start PostgreSQL + Redis containers
docker compose up -d

# Verify containers are running
docker compose ps
```

Expected output:
```
NAME                  STATUS          PORTS
alpha_groups_db       Up (healthy)    0.0.0.0:5432->5432/tcp
alpha_groups_redis    Up (healthy)    0.0.0.0:6379->6379/tcp
```

### Run Database Migrations

Run each migration file through the Docker container:

```powershell
# Run migrations in order
docker exec -i alpha_groups_db psql -U postgres -d alpha_groups -f - < backend\migrations\001_initial_schema.sql
docker exec -i alpha_groups_db psql -U postgres -d alpha_groups -f - < backend\migrations\002_add_indexes.sql
docker exec -i alpha_groups_db psql -U postgres -d alpha_groups -f - < backend\migrations\003_add_rls_policies.sql
docker exec -i alpha_groups_db psql -U postgres -d alpha_groups -f - < backend\migrations\004_add_nonce_cleanup.sql
docker exec -i alpha_groups_db psql -U postgres -d alpha_groups -f - < backend\migrations\005_seed_data.sql
```

**Alternative** - Copy files into the container and run:

```powershell
# Copy all migration files into the container
docker cp backend\migrations\001_initial_schema.sql alpha_groups_db:/tmp/
docker cp backend\migrations\002_add_indexes.sql alpha_groups_db:/tmp/
docker cp backend\migrations\003_add_rls_policies.sql alpha_groups_db:/tmp/
docker cp backend\migrations\004_add_nonce_cleanup.sql alpha_groups_db:/tmp/
docker cp backend\migrations\005_seed_data.sql alpha_groups_db:/tmp/

# Run them in order
docker exec alpha_groups_db psql -U postgres -d alpha_groups -f /tmp/001_initial_schema.sql
docker exec alpha_groups_db psql -U postgres -d alpha_groups -f /tmp/002_add_indexes.sql
docker exec alpha_groups_db psql -U postgres -d alpha_groups -f /tmp/003_add_rls_policies.sql
docker exec alpha_groups_db psql -U postgres -d alpha_groups -f /tmp/004_add_nonce_cleanup.sql
docker exec alpha_groups_db psql -U postgres -d alpha_groups -f /tmp/005_seed_data.sql
```

This creates all tables, indexes, RLS policies, and seeds a default admin user:
- **Email:** `admin@alphagroups.xyz`
- **Password:** `admin123`

### Verify Database (optional)

```powershell
# Connect to PostgreSQL inside the container
docker exec -it alpha_groups_db psql -U postgres -d alpha_groups

# Inside psql, list tables
\dt

# Check seed data
SELECT * FROM admins;
SELECT * FROM groups;

# Exit
\q
```

---

## Step 3: Configure Environment Variables

### Backend

```powershell
copy backend\.env.example backend\.env
```

Edit `backend\.env` with your values (use Notepad, VS Code, or any editor):

```env
# Local Docker database (no Supabase needed for dev)
SUPABASE_URL=http://localhost:5432
SUPABASE_ANON_KEY=local-dev-key
SUPABASE_SERVICE_KEY=local-dev-key

# Telegram bot token (from @BotFather)
TELEGRAM_BOT_TOKEN=<your-bot-token>
TELEGRAM_SECRET_TOKEN=dev-secret-token-12345678

# FairScale API (get from https://sales.fairscale.xyz/)
FAIRSCALE_API_KEY=zpka_b255a33b9bbe4934ac1f67be2de76c54_596dd33f
FAIRSCALE_API_URL=https://api.fairscale.xyz

# Local Redis
REDIS_URL=redis://localhost:6379

# Security (change in production)
JWT_SECRET=dev-jwt-secret-change-me
CRON_SECRET=dev-cron-secret-change-me

# App
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug
```

### Frontend

```powershell
copy frontend\.env.example frontend\.env.local
```

Edit `frontend\.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_APP_NAME=Alpha Groups
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> Use `devnet` for testing to avoid using real SOL.

---

## Step 4: Start the Application

Open **two terminal windows** (PowerShell or cmd):

### Terminal 1 - Backend

```powershell
cd backend
npm run dev
```

Expected output:
```
🚀 Alpha Groups Backend API
📡 Server running on http://localhost:3001
🔗 Health check: http://localhost:3001/api/health
📝 API docs: http://localhost:3001/
```

### Terminal 2 - Frontend

```powershell
cd frontend
npm run dev
```

Expected output:
```
▲ Next.js 14.x.x
- Local: http://localhost:3000
```

---

## Step 5: Test the Backend API

You can use **PowerShell**, **curl** (if installed), or a tool like **Postman** / **Insomnia**.

### 5.1 Health Check

**PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/health
```

**curl (if available):**
```powershell
curl http://localhost:3001/api/health
```

**Browser:**
Open http://localhost:3001/api/health

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-16T...",
  "services": {
    "database": "connected",
    "redis": "connected",
    "telegram": "connected"
  },
  "version": "1.0.0"
}
```

### 5.2 Root Endpoint

Open http://localhost:3001/ in your browser.

Expected response:
```json
{
  "name": "Alpha Groups Backend API",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "/api/health",
    "verify": "POST /api/verify",
    "admin": "/api/admin/*",
    "cron": "POST /api/cron/recheck-members"
  }
}
```

### 5.3 Admin Login

**PowerShell:**
```powershell
$body = @{
    email = "admin@alphagroups.xyz"
    password = "admin123"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/admin/login `
    -ContentType "application/json" -Body $body
```

**curl:**
```powershell
curl -X POST http://localhost:3001/api/admin/login -H "Content-Type: application/json" -d "{\"email\":\"admin@alphagroups.xyz\",\"password\":\"admin123\"}"
```

Expected response:
```json
{
  "token": "eyJhbGc...",
  "admin": {
    "id": "...",
    "email": "admin@alphagroups.xyz"
  }
}
```

Save the token for subsequent admin requests:
```powershell
$TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoiYWVkODBlZjQtYzJkMy00MTY1LWI0ODAtODA5OGY0MTMxZTkwIiwiZW1haWwiOiJhZG1pbkBhbHBoYWdyb3Vwcy54eXoiLCJ0eXBlIjoiYWRtaW4iLCJpYXQiOjE3NzEyNjA2MDAsImV4cCI6MTc3MTg2NTQwMH0.Rcu47VJylzPpMnYeflVRgbjEMhDqGgYRd5NnKmtxt1A"
```

### 5.4 Admin Endpoints (with token)

**Get members (PowerShell):**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/admin/members?groupId=<group-uuid>" `
    -Headers @{ Authorization = "Bearer $TOKEN" }
```

**Get analytics (PowerShell):**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/admin/analytics?groupId=<group-uuid>" `
    -Headers @{ Authorization = "Bearer $TOKEN" }
```

**Update settings (PowerShell):**
```powershell
$body = @{
    groupId = "<group-uuid>"
    bronzeThreshold = 350
    silverThreshold = 550
    goldThreshold = 750
    autoKickEnabled = $true
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/admin/settings `
    -ContentType "application/json" -Headers @{ Authorization = "Bearer $TOKEN" } -Body $body
```

### 5.5 Verification Endpoint (mock test)

**PowerShell:**
```powershell
$body = @{
    telegramId = "123456789"
    publicKey = "7xKzV8qF3mN2pL9rH4sT6jW8kX1yZ5uA3bC9dE4fG7hJ"
    signature = @(1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64)
    message = "Sign in to Alpha Groups`n`nURI: https://alpha-groups.vercel.app`nIssued At: 2026-02-16T10:30:00.000Z`nNonce: test-nonce-12345678901234567890"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/verify `
    -ContentType "application/json" -Body $body
```

> This will fail with "Invalid signature" since the signature is fake - that's expected. A real test requires signing from a wallet.

### 5.6 Cron Endpoint

**PowerShell:**
```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/cron/recheck-members `
    -Headers @{ Authorization = "Bearer dev-cron-secret-change-me" }
```

### 5.7 Rate Limiting Test

**PowerShell:**
```powershell
# Send 11 rapid requests to verify endpoint (limit is 10/hour)
1..11 | ForEach-Object {
    Write-Host "Request $_:" -NoNewline
    try {
        $result = Invoke-WebRequest -Method Post -Uri http://localhost:3001/api/verify `
            -ContentType "application/json" `
            -Body '{"telegramId":"123","publicKey":"abc","signature":[],"message":"test"}' `
            -ErrorAction Stop
        Write-Host " $($result.StatusCode)"
    } catch {
        Write-Host " $($_.Exception.Response.StatusCode.value__)"
    }
}
```

The 11th request should return `429 Too Many Requests`.

---

## Step 6: Test the Frontend

### 6.1 Landing Page

Open http://localhost:3000 in your browser. Verify:

- [ ] Dark OLED theme (background `#0F172A`)
- [ ] Gold and purple color scheme
- [ ] Orbitron headings, Exo 2 body text
- [ ] Hero section with CTA button
- [ ] Features section
- [ ] Responsive at 375px, 768px, 1024px, 1440px (use browser DevTools)
- [ ] No emojis used as icons (Lucide SVGs only)
- [ ] All buttons have cursor-pointer and hover transitions

### 6.2 Verification Page

Open http://localhost:3000/verify?tid=123456789

- [ ] "Connect Wallet" button appears
- [ ] Clicking opens Solana wallet selector (Phantom, Solflare, etc.)
- [ ] After connecting, "Verify Wallet" button appears
- [ ] Signing triggers POST to backend
- [ ] Success/error states display correctly
- [ ] Loading spinner during verification

> **Tip:** Install [Phantom wallet](https://phantom.app/) browser extension and switch to **Devnet** in Phantom settings for testing.

### 6.3 Admin Login

Open http://localhost:3000/admin/login

- [ ] Login form with email and password
- [ ] Submit with `admin@alphagroups.xyz` / `admin123`
- [ ] Redirects to dashboard on success
- [ ] Shows error on invalid credentials

### 6.4 Admin Dashboard

After logging in, verify each page:

**Dashboard Home** (`/admin`):
- [ ] Stat cards showing total members, average score, tier distribution
- [ ] Recent activity feed
- [ ] Sidebar navigation works

**Members** (`/admin/members`):
- [ ] Member table renders (empty initially)
- [ ] Search input works
- [ ] Tier filter dropdown works
- [ ] Pagination controls present
- [ ] Kick button shows confirmation modal

**Settings** (`/admin/settings`):
- [ ] Threshold inputs for Bronze/Silver/Gold
- [ ] Auto-kick toggle switch
- [ ] Save button submits to API
- [ ] Success notification after save

**Analytics** (`/admin/analytics`):
- [ ] Score distribution bar chart renders
- [ ] Tier breakdown pie/donut chart renders
- [ ] Member growth line chart renders
- [ ] Charts are responsive

---

## Step 7: Test the Telegram Bot

### 7.1 Setup

1. Get your bot token from [@BotFather](https://t.me/BotFather)
2. Add the token to `backend\.env` as `TELEGRAM_BOT_TOKEN`
3. Restart the backend server
4. Find your bot on Telegram and start a conversation

### 7.2 Command Tests

| Command | Expected Behavior |
|---------|-------------------|
| `/start` | Welcome message explaining Alpha Groups |
| `/verify` | Verification link with inline keyboard button |
| `/status` | "Not verified yet" message (or current status if verified) |
| `/help` | List of all available commands |

### 7.3 Group Integration Test

1. Create a **test Telegram group**
2. Add your bot to the group (must be admin with ban permissions)
3. Update the `telegram_group_id` in the database to match your group:
   ```powershell
   docker exec -it alpha_groups_db psql -U postgres -d alpha_groups -c "UPDATE groups SET telegram_group_id = <your-group-id> WHERE name = 'Alpha Groups Test Community';"
   ```
4. Test the bot sends a welcome message when added
5. Test `/verify` generates the correct link with your Telegram ID

### 7.4 Full Verification Flow (End-to-End)

1. Send `/verify` to the bot in DM
2. Click the "Verify Wallet" inline button
3. Opens the frontend verification page in browser
4. Connect your Phantom wallet (set to Devnet)
5. Click "Verify Wallet" to sign the SIWS message
6. Backend verifies signature and fetches FairScore
7. Bot sends you a success/failure notification
8. Check `/status` to confirm your tier

---

## Step 8: Test Edge Cases

### Invalid Signature
- Modify the signature in a verification request
- Should return `400 Invalid signature`

### Expired Message
- Use a timestamp older than 10 minutes in the SIWS message
- Should reject with expired message error

### Nonce Replay
- Capture a valid verification request
- Replay it - should reject with "nonce already used"

### FairScale API Down
- Set `FAIRSCALE_API_URL` to an invalid URL in `backend\.env`
- Restart backend
- Verify the circuit breaker activates after 5 failures
- Cached scores should still be returned if available

### Score Below Threshold
- Use a wallet with FairScore below 300 (bronze threshold)
- Should deny access and send appropriate notification

### Rate Limiting
- Send >100 requests in 15 minutes to any API endpoint
- Should get `429 Too Many Requests`
- Send >10 verification requests in 1 hour
- Should get rate limited

---

## Step 9: Database Verification

### Check Tables Were Created

```powershell
docker exec -it alpha_groups_db psql -U postgres -d alpha_groups -c "\dt"
```

Expected tables: `groups`, `members`, `verifications`, `admins`, `group_admins`, `activity_log`, `used_nonces`

### Check Indexes

```powershell
docker exec -it alpha_groups_db psql -U postgres -d alpha_groups -c "\di"
```

Should show 16+ indexes across all tables.

### Check RLS Policies

```powershell
docker exec -it alpha_groups_db psql -U postgres -d alpha_groups -c "SELECT tablename, policyname FROM pg_policies ORDER BY tablename;"
```

### Verify Seed Data

```powershell
docker exec -it alpha_groups_db psql -U postgres -d alpha_groups -c "SELECT email, name FROM admins;"
docker exec -it alpha_groups_db psql -U postgres -d alpha_groups -c "SELECT name, bronze_threshold, silver_threshold, gold_threshold FROM groups;"
```

---

## Step 10: Redis Cache Verification

```powershell
# Connect to Redis
docker exec -it alpha_groups_redis redis-cli

# Check if any keys exist
KEYS *

# After a verification, check cached FairScore
GET fairscore:<wallet-address>

# Check TTL on a cached key
TTL fairscore:<wallet-address>

# Exit
EXIT
```

---

## Cleanup

### Stop Docker Containers

```powershell
docker compose down
```

### Stop and Remove Volumes (wipe database)

```powershell
docker compose down -v
```

### Stop Application

Press `Ctrl+C` in both terminal windows (backend and frontend).

---

## Troubleshooting

### Docker not starting

| Issue | Fix |
|-------|-----|
| Docker Desktop not running | Open Docker Desktop from Start Menu, wait for it to start |
| `docker compose` not found | Update Docker Desktop or use `docker-compose` (with hyphen) |
| Port 5432 already in use | Stop local PostgreSQL: `net stop postgresql-x64-15` or change port in docker-compose.yml |
| Port 6379 already in use | Stop local Redis or change port in docker-compose.yml |

### Backend won't start

| Issue | Fix |
|-------|-----|
| `Cannot find module` | Run `npm install` in `backend\` |
| `ECONNREFUSED :5432` | Run `docker compose up -d` and wait for healthy status |
| `ECONNREFUSED :6379` | Run `docker compose up -d` and wait for healthy status |
| Port 3001 in use | Change `PORT` in `.env` or run `netstat -ano | findstr :3001` to find and kill the process |

### Frontend won't start

| Issue | Fix |
|-------|-----|
| `Module not found` | Run `npm install` in `frontend\` |
| Wallet adapter error | Check `NEXT_PUBLIC_SOLANA_NETWORK` in `.env.local` |
| Port 3000 in use | Run `npx next dev -p 3002` or find process with `netstat -ano | findstr :3000` |

### Database migration issues

| Issue | Fix |
|-------|-----|
| Migration fails | Check container is running: `docker compose ps` |
| "relation already exists" | Tables already created - safe to ignore, or wipe with `docker compose down -v` and re-run |
| Tables missing | Re-run the migration commands from Step 2 |
| "database alpha_groups does not exist" | Container may have restarted - run `docker compose down -v` then `docker compose up -d` |

### Telegram bot not responding

| Issue | Fix |
|-------|-----|
| No response to commands | Check `TELEGRAM_BOT_TOKEN` is correct in `backend\.env` |
| Webhook errors | For local dev, ensure polling mode is used (not webhook) |
| Bot not in group | Add bot as admin with "Ban users" permission |

### FairScale API errors

| Issue | Fix |
|-------|-----|
| 401 Unauthorized | Check `FAIRSCALE_API_KEY` is valid |
| Timeout errors | Circuit breaker will activate, check logs in `backend\error.log` |
| Score returns 0 | Wallet may have no on-chain history |

---

## Using Postman (Recommended for Windows)

If you prefer a GUI over PowerShell commands, use **Postman** (free):

1. Download from https://www.postman.com/downloads/
2. Import these requests:

| Method | URL | Headers | Body |
|--------|-----|---------|------|
| GET | `http://localhost:3001/api/health` | - | - |
| GET | `http://localhost:3001/` | - | - |
| POST | `http://localhost:3001/api/admin/login` | Content-Type: application/json | `{"email":"admin@alphagroups.xyz","password":"admin123"}` |
| GET | `http://localhost:3001/api/admin/members?groupId=<uuid>` | Authorization: Bearer `<token>` | - |
| GET | `http://localhost:3001/api/admin/analytics?groupId=<uuid>` | Authorization: Bearer `<token>` | - |
| POST | `http://localhost:3001/api/admin/settings` | Authorization: Bearer `<token>`, Content-Type: application/json | `{"groupId":"<uuid>","bronzeThreshold":350,...}` |
| POST | `http://localhost:3001/api/cron/recheck-members` | Authorization: Bearer `dev-cron-secret-change-me` | - |

---

## Quick Reference

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Health Check | http://localhost:3001/api/health |
| API Info | http://localhost:3001/ |
| PostgreSQL | localhost:5432 (user: postgres, pass: postgres, db: alpha_groups) |
| Redis | localhost:6379 |
| Admin Login | admin@alphagroups.xyz / admin123 |
