# Alpha Groups - Complete Specification

**Reputation-Gated Telegram Communities using FairScale**

🏆 **Fairathon Hackathon Project** | February 2026

---

## Quick Stats

| Metric | Value |
|--------|-------|
| **Development Time** | 3-4 weeks |
| **Tech Stack** | Node.js + Next.js + Solana |
| **Database** | Supabase (PostgreSQL) |
| **Blockchain** | Solana only |
| **FairScore Range** | 0-1000 |
| **Default Tiers** | Bronze 300+, Silver 500+, Gold 700+ |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Why FairScore is Core](#why-fairscore-is-core)
3. [Technical Architecture](#technical-architecture)
4. [Database Schema](#database-schema)
5. [Solana Wallet Verification](#solana-wallet-verification)
6. [FairScale API Integration](#fairscale-api-integration)
7. [Telegram Bot Implementation](#telegram-bot-implementation)
8. [Frontend Development](#frontend-development)
9. [Admin Dashboard](#admin-dashboard)
10. [Automated Management](#automated-management)
11. [API Endpoints](#api-endpoints)
12. [Environment Variables](#environment-variables)
13. [Implementation Timeline](#implementation-timeline)
14. [Deployment Guide](#deployment-guide)
15. [Testing Strategy](#testing-strategy)
16. [Go-to-Market](#go-to-market)
17. [Fairathon Submission](#fairathon-submission)
18. [GasPass Project](#gaspass-project)

---

## Executive Summary

### What is Alpha Groups?

Alpha Groups is a Telegram bot that **automatically manages community access** based on members' **on-chain reputation** using FairScale's reputation infrastructure. It verifies Solana wallets, checks FairScores (0-1000), and grants tiered access based on configurable reputation thresholds.

### The Problem

- Telegram/Discord groups are **flooded with bots, scammers, and low-quality members**
- **Manual vetting doesn't scale** beyond a few dozen members
- Traditional reputation systems are **centralized, gameable, and unverifiable**
- **No dynamic adjustment** as member behavior changes over time
- Premium alpha groups **waste time filtering** instead of sharing insights

### The Solution

Alpha Groups uses **FairScale's on-chain reputation** (FairScore 0-1000) to automatically:

✅ **Verify wallet ownership** via cryptographic signatures (FREE, no gas)
✅ **Gate community access** with admin-configurable reputation thresholds
✅ **Auto-promote/demote/kick** members as their reputation changes
✅ **Provide tiered access** - Bronze (300+), Silver (500+), Gold (700+)
✅ **Full admin control** via intuitive web dashboard
✅ **Real-time notifications** for verifications, tier changes, warnings

### Key Features

| Feature | Description |
|---------|-------------|
| **Wallet Verification** | Cryptographic signature verification for Solana wallets (Phantom, Solflare, etc.) - completely free, no gas required |
| **FairScore Integration** | Real-time reputation checking via FairScale API. FairScore ranges from 0-1000, providing granular reputation assessment |
| **Tiered Access** | Three reputation tiers (Bronze, Silver, Gold) with customizable thresholds. Admins can set their own minimum scores |
| **Auto-Management** | Daily automated re-checks of all members. Automatic kick/promote/demote based on FairScore changes |
| **Admin Dashboard** | Web-based control panel for threshold configuration, member management, analytics, and manual interventions |
| **Real-time Notifications** | Telegram notifications for verification success, tier changes, warnings before kicks, and admin alerts |

---

## Why FairScore is Core

**This addresses the Fairathon's 30% judging criteria for FairScore integration.**

### 1. Access Control Mechanism

FairScore **DIRECTLY determines** whether a user can join or remain in a community. Without FairScore, there is no product. This is **not decorative** - it's the **core value proposition**.

### 2. Dynamic Reputation System

FairScore **changes over time** based on on-chain behavior. Alpha Groups re-checks members daily, creating communities that **evolve dynamically** with members' reputations.

### 3. Gamification & Incentive Alignment

Members are **incentivized to improve** their on-chain reputation to access better tiers. This creates a **positive feedback loop** where community quality naturally improves.

### 4. Sybil Resistance Built-In

FairScore's on-chain nature makes it **expensive to fake**. You can't easily create 100 high-reputation wallets like you can with email addresses. This makes Alpha Groups **naturally bot-resistant**.

---

## Technical Architecture

### Complete Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Backend Language** | Node.js with TypeScript | Great async support, huge ecosystem, type safety |
| **Backend Framework** | Express.js | Minimal, flexible, widely used for RESTful APIs |
| **Database** | Supabase (PostgreSQL) | Free tier, auto-generated APIs, built-in auth, real-time subscriptions |
| **Telegram Bot** | node-telegram-bot-api | Well-maintained, full Telegram Bot API support |
| **Solana Libraries** | @solana/web3.js, tweetnacl | Wallet handling, signature verification |
| **Frontend Framework** | Next.js 14 (React) | Server-side rendering, API routes, excellent DX |
| **Wallet Connection** | @solana/wallet-adapter-react | Supports Phantom, Solflare, Backpack, etc. |
| **Styling** | Tailwind CSS | Utility-first, fast development, small bundle |
| **UI Components** | shadcn/ui | Beautiful, accessible, customizable React components |
| **Charts/Analytics** | Recharts | React-based charting, works great with Next.js |
| **Cron Jobs** | GitHub Actions | Free, reliable, easy logging, manual trigger |
| **Frontend Hosting** | Vercel | Free tier, perfect Next.js integration, automatic deployments |
| **Backend Hosting** | Railway or Render | Free/cheap tiers, easy deployment, good for Node.js |

### System Architecture Flow

```
User → Telegram Bot → Backend API
User → Verification Web Page → Backend API
Backend API → Supabase (data storage)
Backend API → FairScale API (reputation check)
GitHub Actions → Backend API (daily cron)
Admin → Dashboard UI → Backend API
```

### Project Structure

```
alpha-groups/
├── backend/
│   ├── src/
│   │   ├── bot/
│   │   │   ├── telegram-bot.ts      # Telegram bot logic
│   │   │   └── handlers.ts          # Command handlers
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── verify.ts        # POST /api/verify
│   │   │   │   ├── members.ts       # GET /api/members
│   │   │   │   ├── settings.ts      # GET/POST /api/settings
│   │   │   │   └── admin.ts         # Admin endpoints
│   │   │   └── middleware/
│   │   │       └── auth.ts          # JWT auth for admin
│   │   ├── services/
│   │   │   ├── fairscale.ts         # FairScale API client
│   │   │   ├── solana-verify.ts     # Signature verification
│   │   │   └── member-checker.ts    # Daily re-check logic
│   │   ├── db/
│   │   │   └── client.ts            # Supabase client
│   │   ├── cron/
│   │   │   └── daily-check.ts       # Cron job for re-checks
│   │   └── index.ts                 # Server entry point
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── app/
│   │   ├── verify/
│   │   │   └── page.tsx             # Verification page
│   │   ├── admin/
│   │   │   ├── page.tsx             # Dashboard home
│   │   │   ├── members/
│   │   │   │   └── page.tsx         # Member list
│   │   │   ├── settings/
│   │   │   │   └── page.tsx         # Group settings
│   │   │   └── analytics/
│   │   │       └── page.tsx         # Analytics page
│   │   └── layout.tsx               # Root layout
│   ├── components/
│   │   ├── WalletConnect.tsx        # Solana wallet button
│   │   ├── MemberTable.tsx          # Member list component
│   │   └── ScoreChart.tsx           # Analytics charts
│   ├── lib/
│   │   ├── api.ts                   # API client
│   │   └── utils.ts                 # Helper functions
│   ├── package.json
│   └── next.config.js
│
├── .github/
│   └── workflows/
│       └── daily-recheck.yml        # GitHub Actions cron
│
└── README.md
```

---

## Database Schema

### Complete SQL Schema for Supabase

Run this in the Supabase SQL Editor:

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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members table
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    telegram_username VARCHAR(255),
    wallet_address VARCHAR(255) NOT NULL,
    fairscore INT,
    tier VARCHAR(50), -- 'bronze', 'silver', 'gold'
    last_checked TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, telegram_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_members_group_id ON members(group_id);
CREATE INDEX idx_members_wallet ON members(wallet_address);
CREATE INDEX idx_members_telegram_id ON members(telegram_id);

-- Verifications table (audit log)
CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    signature TEXT NOT NULL,
    message TEXT NOT NULL,
    verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admins table (for dashboard auth)
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group admins junction table
CREATE TABLE group_admins (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, admin_id)
);

-- Activity log (optional but useful for debugging)
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id),
    action VARCHAR(100), -- 'verified', 'kicked', 'promoted', 'demoted'
    old_score INT,
    new_score INT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table Relationships

```
groups (1) ←→ (many) members
groups (many) ←→ (many) admins (through group_admins)
members (1) ←→ (many) activity_log
members (1) ←→ (many) verifications (via telegram_id)
```

---

## Solana Wallet Verification

### Verification Flow Overview

1. User receives verification link from Telegram bot
2. Opens link in browser (mobile or desktop)
3. Clicks "Connect Wallet" (Phantom/Solflare auto-detected)
4. Wallet prompts approval (no transaction, **FREE**)
5. Signs unique message proving wallet ownership
6. Backend verifies signature cryptographically
7. Backend queries FairScale API for reputation
8. Bot grants/denies Telegram access based on score

### Frontend Implementation (Next.js)

**Install dependencies:**

```bash
npm install @solana/wallet-adapter-react
npm install @solana/wallet-adapter-react-ui
npm install @solana/wallet-adapter-wallets
npm install @solana/web3.js
```

**Verification page (`app/verify/page.tsx`):**

```typescript
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function VerifyPage() {
  const { publicKey, signMessage } = useWallet();
  const searchParams = useSearchParams();
  const telegramId = searchParams.get('tid');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleVerify = async () => {
    if (!publicKey || !signMessage || !telegramId) return;

    setStatus('loading');

    try {
      const nonce = Date.now().toString();
      const message = `Verify wallet for Alpha Groups

Telegram ID: ${telegramId}
Nonce: ${nonce}
Timestamp: ${new Date().toISOString()}

This signature is free and safe.`;

      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);

      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          publicKey: publicKey.toString(),
          signature: Array.from(signature),
          message
        })
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(`✅ Verified! Your FairScore: ${data.fairscore}. Tier: ${data.tier}`);
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Failed to sign message');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">Verify Your Wallet</h2>
          <p className="mt-2 text-center text-gray-600">
            Connect your Solana wallet to verify your reputation
          </p>
        </div>

        <div className="space-y-4">
          <WalletMultiButton className="w-full" />

          {publicKey && (
            <button
              onClick={handleVerify}
              disabled={status === 'loading'}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
            >
              {status === 'loading' ? 'Verifying...' : 'Verify Wallet'}
            </button>
          )}

          {message && (
            <div className={`p-4 rounded ${status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Wallet Provider Setup (`app/layout.tsx`):**

```typescript
'use client';

import { useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  BackpackWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

require('@solana/wallet-adapter-react-ui/styles.css');

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ],
    []
  );

  return (
    <html lang="en">
      <body>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              {children}
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </body>
    </html>
  );
}
```

### Backend Verification (Node.js)

**Install dependencies:**

```bash
npm install @solana/web3.js tweetnacl
```

**Signature verification service (`services/solana-verify.ts`):**

```typescript
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';

export function verifySolanaSignature(
  publicKeyStr: string,
  message: string,
  signatureArray: number[]
): boolean {
  try {
    // Convert public key string to bytes
    const publicKey = new PublicKey(publicKeyStr);
    const publicKeyBytes = publicKey.toBytes();

    // Encode message
    const messageBytes = new TextEncoder().encode(message);

    // Convert signature array to Uint8Array
    const signature = new Uint8Array(signatureArray);

    // Verify signature
    return nacl.sign.detached.verify(
      messageBytes,
      signature,
      publicKeyBytes
    );
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
}
```

**Verification API endpoint (`api/routes/verify.ts`):**

```typescript
import { Router } from 'express';
import { verifySolanaSignature } from '../../services/solana-verify';
import { getFairScore } from '../../services/fairscale';
import { supabase } from '../../db/client';
import { grantTelegramAccess, notifyUser } from '../../bot/telegram-bot';

const router = Router();

router.post('/verify', async (req, res) => {
  const { telegramId, publicKey, signature, message } = req.body;

  try {
    // 1. Verify signature
    const isValid = verifySolanaSignature(publicKey, message, signature);

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    // 2. Store verification in audit log
    await supabase.from('verifications').insert({
      telegram_id: telegramId,
      wallet_address: publicKey,
      signature: JSON.stringify(signature),
      message
    });

    // 3. Get FairScore from FairScale API
    const fairscore = await getFairScore(publicKey);

    // 4. Determine tier based on group thresholds
    // (For MVP, use default group or first group)
    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .limit(1)
      .single();

    let tier = 'none';
    if (fairscore >= group.gold_threshold) tier = 'gold';
    else if (fairscore >= group.silver_threshold) tier = 'silver';
    else if (fairscore >= group.bronze_threshold) tier = 'bronze';

    // 5. Store/update member
    const { data: member } = await supabase
      .from('members')
      .upsert({
        group_id: group.id,
        telegram_id: telegramId,
        wallet_address: publicKey,
        fairscore,
        tier,
        last_checked: new Date().toISOString()
      }, {
        onConflict: 'group_id,telegram_id'
      })
      .select()
      .single();

    // 6. Grant or deny Telegram access
    if (tier !== 'none') {
      await grantTelegramAccess(telegramId, group.telegram_group_id);
      await notifyUser(telegramId, `✅ Verified! Your FairScore: ${fairscore}. Tier: ${tier.toUpperCase()}`);

      return res.json({ success: true, fairscore, tier });
    } else {
      await notifyUser(telegramId, `❌ Your FairScore (${fairscore}) is below the minimum (${group.bronze_threshold})`);

      return res.json({ success: false, error: 'Score too low', fairscore, required: group.bronze_threshold });
    }
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
```

---

## FairScale API Integration

**FairScale API service (`services/fairscale.ts`):**

```typescript
import axios from 'axios';

const FAIRSCALE_API_URL = process.env.FAIRSCALE_API_URL || 'https://api.fairscale.xyz';
const FAIRSCALE_API_KEY = process.env.FAIRSCALE_API_KEY;

export async function getFairScore(walletAddress: string): Promise<number> {
  try {
    const response = await axios.get(
      `${FAIRSCALE_API_URL}/v1/score/${walletAddress}`,
      {
        headers: {
          'Authorization': `Bearer ${FAIRSCALE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Expected response format:
    // {
    //   "address": "7xK...abc",
    //   "score": 650,
    //   "tier": "medium",
    //   "last_updated": "2026-02-15T10:30:00Z"
    // }

    return response.data.score || 0;
  } catch (error) {
    console.error('FairScale API error:', error);
    // Return 0 if API fails (can be changed based on requirements)
    return 0;
  }
}

export async function batchGetFairScores(walletAddresses: string[]): Promise<Map<string, number>> {
  // For daily re-checks, batch API call would be more efficient
  // Check FairScale docs for batch endpoint
  const scores = new Map<string, number>();

  // For now, sequential calls (replace with batch endpoint when available)
  for (const address of walletAddresses) {
    const score = await getFairScore(address);
    scores.set(address, score);
  }

  return scores;
}
```

**Get FairScale API Access:**

1. Visit https://sales.fairscale.xyz/
2. Sign up for API access
3. Read documentation: https://docs.fairscale.xyz/
4. Save API key to `.env` file

---

## Telegram Bot Implementation

**Install dependencies:**

```bash
npm install node-telegram-bot-api
npm install @types/node-telegram-bot-api --save-dev
```

**Telegram bot (`bot/telegram-bot.ts`):**

```typescript
import TelegramBot from 'node-telegram-bot-api';
import { supabase } from '../db/client';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://yourapp.vercel.app';

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  await bot.sendMessage(chatId,
    `👋 Welcome to Alpha Groups!\n\n` +
    `I help manage reputation-gated communities using on-chain credentials.\n\n` +
    `To verify your wallet and join, use /verify`
  );
});

// Handle /verify command
bot.onText(/\/verify/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) return;

  // Generate verification link
  const verificationUrl = `${FRONTEND_URL}/verify?tid=${userId}`;

  await bot.sendMessage(chatId,
    `🔐 Wallet Verification\n\n` +
    `Click the link below to connect your Solana wallet:\n\n` +
    `${verificationUrl}\n\n` +
    `This will:\n` +
    `✅ Verify your wallet ownership (FREE, no gas)\n` +
    `✅ Check your FairScore reputation\n` +
    `✅ Grant access if you meet the threshold\n\n` +
    `⚠️ Make sure you have Phantom or Solflare installed!`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '🔗 Verify Wallet', url: verificationUrl }
        ]]
      }
    }
  );
});

// Handle /status command
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) return;

  // Check if user is verified
  const { data: member } = await supabase
    .from('members')
    .select('*, groups(*)')
    .eq('telegram_id', userId)
    .single();

  if (!member) {
    await bot.sendMessage(chatId, '❌ You are not verified yet. Use /verify to get started!');
    return;
  }

  await bot.sendMessage(chatId,
    `✅ Verification Status\n\n` +
    `Wallet: ${member.wallet_address.slice(0, 4)}...${member.wallet_address.slice(-4)}\n` +
    `FairScore: ${member.fairscore} / 1000\n` +
    `Tier: ${member.tier.toUpperCase()}\n` +
    `Last checked: ${new Date(member.last_checked).toLocaleString()}\n\n` +
    `Group: ${member.groups.name}\n` +
    `Bronze: ${member.groups.bronze_threshold}+\n` +
    `Silver: ${member.groups.silver_threshold}+\n` +
    `Gold: ${member.groups.gold_threshold}+`
  );
});

// Helper functions for bot actions
export async function grantTelegramAccess(userId: number, groupId: number): Promise<void> {
  try {
    // Unban user if they were previously kicked
    await bot.unbanChatMember(groupId, userId, { only_if_banned: true });
  } catch (error) {
    console.error('Error granting access:', error);
  }
}

export async function kickMember(userId: number, groupId: number): Promise<void> {
  try {
    await bot.banChatMember(groupId, userId);
  } catch (error) {
    console.error('Error kicking member:', error);
  }
}

export async function notifyUser(userId: number, message: string): Promise<void> {
  try {
    await bot.sendMessage(userId, message);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

export { bot };
```

**Create Telegram Bot:**

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Follow the prompts to create your bot
4. Save the API token to `.env` file
5. (Optional) Set bot description and profile picture

**Bot Commands to Register:**

```
start - Get started with Alpha Groups
verify - Verify your Solana wallet
status - Check your verification status
help - Get help and support
```

---

## Frontend Development

### Next.js Setup

**Create Next.js app:**

```bash
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui
npm install @solana/wallet-adapter-wallets @solana/web3.js
npm install recharts shadcn-ui
```

### Key Pages

1. **`/verify`** - Wallet verification page (shown above)
2. **`/admin`** - Admin dashboard home
3. **`/admin/members`** - Member list and management
4. **`/admin/settings`** - Group configuration
5. **`/admin/analytics`** - Analytics and charts

### Admin Dashboard Components

**Member Table (`components/MemberTable.tsx`):**

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Member {
  id: string;
  telegram_username: string;
  wallet_address: string;
  fairscore: number;
  tier: string;
  last_checked: string;
  joined_at: string;
}

export function MemberTable({ groupId }: { groupId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, [groupId]);

  async function fetchMembers() {
    const response = await fetch(`/api/admin/members?groupId=${groupId}`);
    const data = await response.json();
    setMembers(data.members);
    setLoading(false);
  }

  async function kickMember(memberId: string) {
    if (!confirm('Are you sure you want to kick this member?')) return;

    await fetch('/api/admin/kick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, memberId })
    });

    fetchMembers();
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wallet</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">FairScore</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {members.map((member) => (
            <tr key={member.id}>
              <td className="px-6 py-4 whitespace-nowrap">@{member.telegram_username}</td>
              <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                {member.wallet_address.slice(0, 4)}...{member.wallet_address.slice(-4)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`font-bold ${
                  member.fairscore >= 700 ? 'text-yellow-600' :
                  member.fairscore >= 500 ? 'text-gray-600' :
                  member.fairscore >= 300 ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {member.fairscore}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  member.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                  member.tier === 'silver' ? 'bg-gray-100 text-gray-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {member.tier.toUpperCase()}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(member.joined_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <button
                  onClick={() => kickMember(member.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Kick
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Automated Management

### Daily Re-check System

**Member checker service (`services/member-checker.ts`):**

```typescript
import { supabase } from '../db/client';
import { getFairScore } from './fairscale';
import { kickMember, notifyUser } from '../bot/telegram-bot';

export async function recheckAllMembers() {
  console.log('Starting daily member re-check...');

  // Get all members
  const { data: members, error } = await supabase
    .from('members')
    .select('*, groups(*)');

  if (error) {
    console.error('Error fetching members:', error);
    return;
  }

  let kicked = 0;
  let promoted = 0;
  let demoted = 0;
  let checked = 0;

  for (const member of members!) {
    try {
      // Get fresh FairScore
      const newScore = await getFairScore(member.wallet_address);
      const oldScore = member.fairscore;
      const group = member.groups;

      // Determine new tier
      let newTier = 'none';
      if (newScore >= group.gold_threshold) newTier = 'gold';
      else if (newScore >= group.silver_threshold) newTier = 'silver';
      else if (newScore >= group.bronze_threshold) newTier = 'bronze';

      // Update member
      await supabase
        .from('members')
        .update({
          fairscore: newScore,
          tier: newTier,
          last_checked: new Date().toISOString()
        })
        .eq('id', member.id);

      // Log activity
      await supabase.from('activity_log').insert({
        member_id: member.id,
        action: newTier === 'none' ? 'kicked' :
                newScore > oldScore ? 'promoted' :
                newScore < oldScore ? 'demoted' : 'checked',
        old_score: oldScore,
        new_score: newScore,
        details: `Tier: ${member.tier} → ${newTier}`
      });

      // Handle tier changes
      if (newTier === 'none' && group.auto_kick_enabled) {
        // Kick if below minimum
        await kickMember(member.telegram_id, group.telegram_group_id);
        await notifyUser(
          member.telegram_id,
          `❌ You were removed from ${group.name}.\n\n` +
          `Your FairScore dropped to ${newScore} (minimum: ${group.bronze_threshold}).\n\n` +
          `Build your on-chain reputation and rejoin!`
        );
        kicked++;
      } else if (newTier !== member.tier) {
        // Tier changed
        if (newScore > oldScore) {
          promoted++;
          await notifyUser(
            member.telegram_id,
            `🎉 Congratulations!\n\n` +
            `You've been promoted to ${newTier.toUpperCase()} tier in ${group.name}!\n\n` +
            `Your FairScore: ${newScore} (was ${oldScore})\n\n` +
            `Keep building your reputation! 🚀`
          );
        } else {
          demoted++;
          await notifyUser(
            member.telegram_id,
            `⚠️ Tier Change\n\n` +
            `You've been moved to ${newTier.toUpperCase()} tier in ${group.name}.\n\n` +
            `Your FairScore: ${newScore} (was ${oldScore})\n\n` +
            `Focus on quality on-chain interactions to improve your score.`
          );
        }
      }

      checked++;
    } catch (error) {
      console.error(`Error checking member ${member.id}:`, error);
    }
  }

  console.log(`Daily re-check complete: ${checked} checked, ${kicked} kicked, ${promoted} promoted, ${demoted} demoted`);

  return { total: checked, kicked, promoted, demoted };
}
```

### GitHub Actions Cron Job

**`.github/workflows/daily-recheck.yml`:**

```yaml
name: Daily FairScore Re-check

on:
  schedule:
    - cron: '0 3 * * *'  # 3 AM UTC daily
  workflow_dispatch:  # Allows manual trigger

jobs:
  recheck:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Re-check
        run: |
          curl -X POST ${{ secrets.BACKEND_URL }}/api/cron/recheck-members \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

**Backend cron endpoint (`api/routes/cron.ts`):**

```typescript
import { Router } from 'express';
import { recheckAllMembers } from '../../services/member-checker';

const router = Router();

router.post('/recheck-members', async (req, res) => {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await recheckAllMembers();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Cron error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

**Set GitHub Secrets:**

1. Go to your repo → Settings → Secrets and variables → Actions
2. Add `BACKEND_URL` (your backend URL)
3. Add `CRON_SECRET` (random secure string)

---

## API Endpoints

### Public Endpoints

#### `POST /api/verify`

Verify a Solana wallet and check FairScore.

**Request:**
```json
{
  "telegramId": "123456789",
  "publicKey": "7xK...abc",
  "signature": [12, 34, 56, ...],
  "message": "Verify wallet for Alpha Groups\n\nTelegram ID: 123456789..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "fairscore": 650,
  "tier": "silver"
}
```

**Response (Failed):**
```json
{
  "success": false,
  "error": "Score too low",
  "fairscore": 250,
  "required": 300
}
```

#### `GET /api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-15T10:30:00Z"
}
```

### Admin Endpoints (Auth Required)

#### `GET /api/admin/members?groupId=<uuid>`

Get all members of a group.

**Response:**
```json
{
  "members": [
    {
      "id": "uuid",
      "telegram_id": 123456789,
      "telegram_username": "cryptouser",
      "wallet_address": "7xK...abc",
      "fairscore": 650,
      "tier": "silver",
      "last_checked": "2026-02-15T10:30:00Z",
      "joined_at": "2026-02-10T08:00:00Z"
    }
  ]
}
```

#### `POST /api/admin/settings`

Update group settings.

**Request:**
```json
{
  "groupId": "uuid",
  "bronzeThreshold": 350,
  "silverThreshold": 550,
  "goldThreshold": 750,
  "autoKickEnabled": true
}
```

**Response:**
```json
{
  "success": true
}
```

#### `POST /api/admin/kick`

Manually kick a member.

**Request:**
```json
{
  "groupId": "uuid",
  "memberId": "uuid"
}
```

**Response:**
```json
{
  "success": true
}
```

#### `GET /api/admin/analytics?groupId=<uuid>`

Get analytics for a group.

**Response:**
```json
{
  "totalMembers": 247,
  "avgScore": 580,
  "tierDistribution": {
    "bronze": 90,
    "silver": 112,
    "gold": 45
  },
  "recentActivity": [
    {
      "action": "promoted",
      "count": 5,
      "date": "2026-02-15"
    }
  ]
}
```

### Cron Endpoint

#### `POST /api/cron/recheck-members`

Trigger daily member re-check (called by GitHub Actions).

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "success": true,
  "total": 247,
  "kicked": 5,
  "promoted": 12,
  "demoted": 3
}
```

---

## Environment Variables

Create `.env` file in backend directory:

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...  # Keep secret!

# Telegram
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# FairScale
FAIRSCALE_API_KEY=your_fairscale_api_key_here
FAIRSCALE_API_URL=https://api.fairscale.xyz

# Frontend URL (for verification links)
FRONTEND_URL=https://yourapp.vercel.app

# Security
CRON_SECRET=random_secure_string_for_cron_auth
JWT_SECRET=another_random_string_for_jwt_tokens

# Server
PORT=3001
NODE_ENV=production
```

**IMPORTANT:** Never commit `.env` to git! Add to `.gitignore`.

---

## Implementation Timeline

### Week 1: Core Verification

**Days 1-2: Setup**
- ✅ Create Supabase project
- ✅ Run SQL schema
- ✅ Initialize backend (Node.js + Express + TypeScript)
- ✅ Initialize frontend (Next.js)
- ✅ Set up Git repository

**Days 3-4: Verification System**
- ✅ Build Solana signature verification module
- ✅ Integrate FairScale API client
- ✅ Create verification webpage with Wallet Adapter
- ✅ Build verification API endpoint

**Days 5-7: Telegram Bot**
- ✅ Create bot via BotFather
- ✅ Implement /start, /verify, /status commands
- ✅ Build helper functions (grant access, kick, notify)
- ✅ Test end-to-end verification flow

### Week 2: Automation

**Days 8-10: Tier Logic**
- ✅ Implement Bronze/Silver/Gold tier system
- ✅ Build member re-check service
- ✅ Add tier change notifications
- ✅ Test tier transitions

**Days 11-12: Auto-kick System**
- ✅ Build auto-kick functionality
- ✅ Add warning notifications (24h before kick)
- ✅ Implement activity logging

**Days 13-14: Cron Job**
- ✅ Set up GitHub Actions workflow
- ✅ Create cron endpoint with auth
- ✅ Test daily re-check
- ✅ Monitor and debug

### Week 3: Admin Dashboard

**Days 15-17: Dashboard Foundation**
- ✅ Build Next.js admin routes
- ✅ Create admin authentication
- ✅ Build member list view with filtering/sorting
- ✅ Add member search functionality

**Days 18-19: Configuration**
- ✅ Create settings page
- ✅ Build threshold configuration UI
- ✅ Add auto-kick toggle
- ✅ Implement settings API

**Days 20-21: Analytics**
- ✅ Build analytics dashboard
- ✅ Add score distribution chart
- ✅ Add tier breakdown
- ✅ Show recent activity timeline
- ✅ Implement manual kick/promote controls

### Week 4: Polish & Launch

**Days 22-24: Testing**
- ✅ End-to-end testing with real users
- ✅ Test all edge cases
- ✅ Performance testing
- ✅ Bug fixes and optimizations

**Days 25-26: Deployment**
- ✅ Deploy frontend to Vercel
- ✅ Deploy backend to Railway/Render
- ✅ Configure environment variables
- ✅ Set up monitoring/logging

**Days 27-28: Fairathon Prep**
- ✅ Create demo video (5 min max)
- ✅ Build pitch deck
- ✅ Write documentation
- ✅ Create Twitter account and post
- ✅ Get initial users/testimonials
- ✅ Submit to Fairathon

---

## Deployment Guide

### Frontend (Vercel)

1. **Push code to GitHub**
2. **Connect to Vercel:**
   - Go to vercel.com
   - Import your repository
   - Select `frontend` as root directory
   - Deploy

3. **Set environment variables in Vercel:**
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
   ```

### Backend (Railway)

1. **Sign up at railway.app**
2. **Create new project:**
   - Choose "Deploy from GitHub repo"
   - Select your repository
   - Set root directory to `backend`

3. **Add environment variables:**
   - Copy all variables from `.env`
   - Add each one in Railway dashboard

4. **Add PostgreSQL (optional):**
   - If not using Supabase, add Railway PostgreSQL
   - For Supabase, just use connection string

### Database (Supabase)

Already set up in [Database Schema](#database-schema) section.

### GitHub Actions

Already set up in [Automated Management](#automated-management) section.

Add these secrets to GitHub repo:
- `BACKEND_URL`
- `CRON_SECRET`

---

## Testing Strategy

### Unit Tests

**Backend tests (`backend/tests/`):**

```typescript
// tests/solana-verify.test.ts
import { verifySolanaSignature } from '../src/services/solana-verify';

describe('Solana Signature Verification', () => {
  it('should verify valid signature', () => {
    const publicKey = '7xK...abc';
    const message = 'Test message';
    const signature = [/* valid signature array */];

    expect(verifySolanaSignature(publicKey, message, signature)).toBe(true);
  });

  it('should reject invalid signature', () => {
    const publicKey = '7xK...abc';
    const message = 'Test message';
    const signature = [/* invalid signature array */];

    expect(verifySolanaSignature(publicKey, message, signature)).toBe(false);
  });
});
```

### Integration Tests

Test complete flows:
- User verification flow
- Tier assignment
- Auto-kick system
- API endpoints

### Manual Testing Checklist

**User Flow:**
- [ ] Join Telegram group
- [ ] Use /verify command
- [ ] Connect wallet (Phantom)
- [ ] Sign message
- [ ] Verify access granted
- [ ] Check /status shows correct info

**Admin Flow:**
- [ ] Log into dashboard
- [ ] View member list
- [ ] Change thresholds
- [ ] Manually kick member
- [ ] View analytics

**Edge Cases:**
- [ ] User with score exactly at threshold
- [ ] User verifies with multiple wallets
- [ ] Score drops below threshold
- [ ] Bot offline during verification
- [ ] FairScale API timeout

---

## Go-to-Market

### Target Launch Communities

**Approach 3-5 existing communities:**

1. **Criteria:**
   - Active Telegram/Discord group (500+ members)
   - Crypto/web3 focused
   - Problem with spam/low-quality members
   - Willing to try new solutions

2. **Pitch:**
   - Free during beta
   - Set up in 5 minutes
   - No maintenance required
   - Immediate quality improvement

### Launch Strategy

**Week 1-2: Beta Launch**
- Partner with 3-5 communities
- Get testimonials
- Collect feedback
- Fix bugs

**Week 3-4: Public Launch**
- Tweet launch announcement
- Post on crypto Twitter
- Share demo video
- Submit to Product Hunt

### Marketing Materials

**Demo Video Script (5 min):**
1. **Problem** (30 sec) - Show spam-filled Telegram group
2. **Solution** (1 min) - Show Alpha Groups verification flow
3. **Features** (2 min) - Demo admin dashboard, tier system
4. **Results** (1 min) - Show analytics, testimonials
5. **Call to Action** (30 sec) - How to get started

**Tweet Thread:**
```
1/ Tired of bots and scammers in your Telegram group?

We built Alpha Groups - a bot that uses @FairScaleXYZ reputation to automatically gate access.

Here's how it works 🧵

2/ When someone joins, they verify their Solana wallet (FREE, no gas) and we check their FairScore (0-1000)

Only users above your threshold get in. Everyone else is auto-kicked.

3/ But here's the magic: FairScore changes over time.

Our bot re-checks members daily. If someone's reputation drops, they're automatically removed. If it rises, they get promoted to higher tiers.

4/ Community owners get a full dashboard:
• Configure thresholds
• View all members + scores
• Manual controls
• Analytics

Set it and forget it. Your community manages itself.

5/ We're live and FREE during beta.

Want to try it? Drop a DM 🤝

Built for @FairScaleXYZ's Fairathon 🏆
```

---

## Fairathon Submission

### Complete Checklist

**Required Deliverables:**
- [ ] Live platform URL (bot functional and testable)
- [ ] GitHub repository pushed to FairScale organization
- [ ] Clear README with setup instructions
- [ ] Integration documentation showing FairScore usage
- [ ] Demo video (YouTube/Loom, max 5 minutes)
- [ ] Pitch deck slides
- [ ] Twitter/X account for the project
- [ ] Tweets and threads showing traction
- [ ] Current user count (even if small)
- [ ] Analytics screenshots
- [ ] Team information (names, roles, contact)
- [ ] Legends.fun product page (invite code: FAIRAT)

### Judging Criteria Strategy

| Criteria | Weight | Our Strategy | Score Target |
|----------|--------|--------------|--------------|
| **FairScore Integration** | 30% | FairScore determines ALL access - it's the core mechanism, not decorative | 28-30 points |
| **Technical Quality** | 25% | Production-ready, well-documented TypeScript codebase with tests | 22-25 points |
| **Traction & Users** | 20% | Partner with 3-5 communities early, show real user numbers | 16-20 points |
| **Business Viability** | 15% | Clear SaaS model ($0/$50/Enterprise) + GTM strategy | 12-15 points |
| **Team & Commitment** | 10% | Regular updates, responsive communication, long-term vision | 8-10 points |
| **TOTAL** | 100% | | **86-100** 🎯 |

### Submission Package

**GitHub README Structure:**
```markdown
# Alpha Groups

Reputation-gated Telegram communities using FairScale.

## Problem
[Brief problem statement]

## Solution
[How Alpha Groups solves it]

## FairScore Integration
[Explain how FairScore is core to the product]

## Setup Instructions
[Step-by-step setup guide]

## Demo
[Link to demo video]

## Tech Stack
[List technologies used]

## Team
[Team information]
```

**Demo Video Outline:**
1. **Hook** (0:00-0:15) - Show the problem
2. **Solution** (0:15-1:30) - Demo verification flow
3. **Features** (1:30-3:30) - Show admin dashboard, auto-management
4. **Traction** (3:30-4:15) - Show real users, testimonials
5. **Vision** (4:15-5:00) - Future roadmap, call to action

---

## GasPass Project

### Overview

**Build this AFTER Alpha Groups is live (3-4 weeks additional dev time).**

GasPass is a **transaction relay service** that executes transactions on behalf of users, pays gas fees upfront, and charges **reputation-based fees** only on successful transactions.

### Concept

Users with higher FairScores pay **lower fees**:

| FairScore Range | Tier | Fee % | Discount |
|----------------|------|-------|----------|
| **0-300** | New User | 5% | - |
| **300-600** | Regular User | 2.5% | 50% |
| **600-850** | Trusted User | 1% | 80% |
| **850-1000** | Elite User | 0.5% | 90% |

### Why GasPass is Stronger

**Compared to Alpha Groups:**

✅ **Higher viral potential** - Cost savings are shareable ("I pay 0.5% fees!")
✅ **Faster user traction** - Solves universal pain point (gas fees)
✅ **Better revenue model** - Fee on EVERY transaction (scales automatically)
✅ **More unique** - No competition in reputation-based gas pricing
✅ **Stronger FairScore integration** - Directly impacts user costs

### Technical Differences

**Alpha Groups:**
- Telegram bot + verification system
- Simple CRUD operations
- Static community management

**GasPass:**
- Transaction relay infrastructure
- Real-time transaction processing
- Capital management (gas fund)
- Smart contract interactions

### Development Plan

**Week 1-2: Core Relay**
- Transaction relay system
- Solana transaction handling
- Fee calculation engine
- FairScale integration

**Week 3: User Interface**
- Web app for submitting transactions
- Real-time transaction status
- Savings calculator

**Week 4: Launch**
- Testing and optimization
- Deploy to production
- Marketing and user acquisition

---

## Next Steps

### Immediate Actions (Right Now)

**1. Get FairScale API Access** ⏰
- Visit https://sales.fairscale.xyz/
- Sign up and get API key
- Read docs: https://docs.fairscale.xyz/

**2. Set Up Supabase** ⏰
- Go to https://supabase.com
- Create new project
- Copy/paste SQL schema from this doc

**3. Create Telegram Bot** ⏰
- Open Telegram
- Find @BotFather
- Send `/newbot`
- Save API token

**4. Switch to Claude Code** ✅

```bash
# In your terminal
claude-code
```

Then say:
> "I want to build Alpha Groups - a Telegram bot for reputation-gated communities using FairScale on Solana. I have the complete spec in ALPHA-GROUPS-SPEC.md. Let's start by setting up the project structure."

### Project Initialization

```bash
# Create project directory
mkdir alpha-groups
cd alpha-groups

# Initialize Git
git init
git add .
git commit -m "Initial commit"

# Create GitHub repo and push
gh repo create alpha-groups --public --source=. --push
```

### First Commits

**Commit 1: Backend setup**
- Initialize Node.js project
- Install dependencies
- Set up TypeScript
- Create basic Express server

**Commit 2: Database setup**
- Run Supabase SQL schema
- Set up Supabase client
- Test database connection

**Commit 3: Solana verification**
- Build signature verification
- Create verification API endpoint
- Test with Phantom wallet

---

## Resources

### FairScale
- **API Access:** https://sales.fairscale.xyz/
- **Documentation:** https://docs.fairscale.xyz/
- **Support:** https://t.me/+XF23ay9aY1AzYzlk
- **Twitter:** https://x.com/fairscalexyz
- **Main Telegram:** https://t.me/+WQlko_c5blJhN2E0

### Development
- **Supabase Docs:** https://supabase.com/docs
- **Solana Wallet Adapter:** https://github.com/solana-labs/wallet-adapter
- **Telegram Bot API:** https://core.telegram.org/bots/api
- **Next.js Docs:** https://nextjs.org/docs

### Community
- **Team Formation:** https://airtable.com/appTQbl8cyJwe2moE/pagjsUKmOH7ObCwMN/form
- **Find Teammates:** https://airtable.com/appTQbl8cyJwe2moE/shrsu24w7bHA8XKLJ/tblLBhDnNlK2oMTUz

---

## Business Model

### Freemium SaaS Pricing

| Tier | Price | Groups | Features |
|------|-------|--------|----------|
| **Free** | $0 | 1 | Basic features, manual re-checks |
| **Pro** | $50/month | 5 | All features, auto re-checks, analytics |
| **Enterprise** | Custom | Unlimited | Custom integrations, priority support, SLA |

### Revenue Projections

**Year 1 (Conservative):**
- 50 free users
- 20 Pro users ($50/mo) = $1,000/mo = **$12,000/year**
- 2 Enterprise ($500/mo) = $1,000/mo = **$12,000/year**
- **Total: $24,000/year**

**Year 2 (Growth):**
- 200 free users
- 100 Pro users = $5,000/mo = **$60,000/year**
- 10 Enterprise = $5,000/mo = **$60,000/year**
- **Total: $120,000/year**

---

## Support

Questions? Need help?

- **GitHub Issues:** [your-repo]/issues
- **Email:** [your-email]
- **Twitter:** [@your-handle]
- **Telegram:** [your-telegram]

---

## License

MIT License - Feel free to use for the Fairathon!

---

**Built for Fairathon 2026** 🏆

Good luck building! 🚀
