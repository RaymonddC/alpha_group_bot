import { Request } from 'express';

// Database Models
export interface Group {
  id: string;
  telegram_group_id: number;
  name: string;
  bronze_threshold: number;
  silver_threshold: number;
  gold_threshold: number;
  auto_kick_enabled: boolean;
  recheck_frequency: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  group_id: string;
  telegram_id: number;
  telegram_username?: string;
  wallet_address: string;
  fairscore: number;
  tier: 'bronze' | 'silver' | 'gold' | 'none';
  last_checked: string;
  joined_at: string;
  updated_at: string;
}

export interface Verification {
  id: string;
  telegram_id: number;
  wallet_address: string;
  signature: string;
  message: string;
  nonce: string;
  verified_at: string;
}

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  name?: string;
  telegram_user_id?: number;
  created_at: string;
  last_login?: string;
}

export interface GroupAdmin {
  group_id: string;
  admin_id: string;
  role: string;
  created_at: string;
}

export interface AdminRegistrationToken {
  id: string;
  token: string;
  telegram_user_id: number;
  telegram_username?: string;
  group_id: string;
  expires_at: string;
  used_at?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  member_id: string;
  action: 'verified' | 'kicked' | 'promoted' | 'demoted' | 'checked';
  old_score?: number;
  new_score?: number;
  old_tier?: string;
  new_tier?: string;
  details?: string;
  created_at: string;
}

export interface UsedNonce {
  nonce: string;
  telegram_id: number;
  used_at: string;
}

// API Request/Response Types
export interface VerifyRequest {
  telegramId: string;
  publicKey: string;
  signature: number[];
  message: string;
  groupId: string;
}

export interface VerifyResponse {
  success: boolean;
  fairscore?: number;
  tier?: string;
  message?: string;
  error?: string;
  required?: number;
  details?: string;
}

export interface MembersQueryParams {
  groupId: string;
  page?: number;
  limit?: number;
  search?: string;
  tier?: 'bronze' | 'silver' | 'gold';
  sortBy?: 'fairscore' | 'joined_at' | 'last_checked';
  sortOrder?: 'asc' | 'desc';
}

export interface MembersResponse {
  members: Member[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SettingsUpdateRequest {
  groupId: string;
  bronzeThreshold?: number;
  silverThreshold?: number;
  goldThreshold?: number;
  autoKickEnabled?: boolean;
}

export interface KickMemberRequest {
  groupId: string;
  memberId: string;
  reason?: string;
}

export interface AnalyticsResponse {
  totalMembers: number;
  avgScore: number;
  medianScore: number;
  tierDistribution: {
    bronze: number;
    silver: number;
    gold: number;
  };
  scoreDistribution: Array<{
    range: string;
    count: number;
  }>;
  recentActivity: Array<{
    date: string;
    verified: number;
    promoted: number;
    demoted: number;
    kicked: number;
  }>;
  topMembers: Array<{
    telegram_username: string;
    fairscore: number;
    tier: string;
  }>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface RecheckSummary {
  total: number;
  checked: number;
  kicked: number;
  promoted: number;
  demoted: number;
  unchanged: number;
  executionTime: number;
  timestamp: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
    telegram: 'connected' | 'disconnected';
  };
  version: string;
}

// JWT Payload
export interface TokenPayload {
  adminId: string;
  email: string;
  type: 'admin';
  iat?: number;
  exp?: number;
}

// Express Request Extensions
export interface AuthRequest extends Request {
  adminId?: string;
}

// FairScale API Response
export interface FairScaleResponse {
  address: string;
  score: number;
  tier?: string;
  last_updated?: string;
}

// Parsed SIWS Message
export interface SIWSMessage {
  domain: string;
  statement?: string;
  uri: string;
  version: string;
  chainId?: string;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
}

// Circuit Breaker State
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_SIGNATURE: 'Signature verification failed. Please try again.',
  SCORE_TOO_LOW: 'Your FairScore is below the minimum threshold. Build your on-chain reputation and try again.',
  FAIRSCALE_TIMEOUT: 'Unable to verify reputation at this time. Please try again in a few minutes.',
  FAIRSCALE_ERROR: 'Reputation service is temporarily unavailable. Please try again later.',
  TELEGRAM_ERROR: 'Unable to grant access. Please contact an admin.',
  DATABASE_ERROR: 'An error occurred. Please try again.',
  RATE_LIMIT: 'Too many requests. Please wait and try again.',
  NONCE_REUSE: 'This signature has already been used. Please refresh and try again.',
  UNAUTHORIZED: 'Missing authorization',
  INVALID_TOKEN: 'Invalid or expired token',
  INVALID_INPUT: 'Invalid input data',
  NOT_FOUND: 'Resource not found',
  INTERNAL_ERROR: 'Internal server error'
} as const;
