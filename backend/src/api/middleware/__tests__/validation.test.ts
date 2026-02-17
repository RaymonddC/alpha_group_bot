import { describe, it, expect } from 'vitest';
import {
  VerifyRequestSchema,
  SettingsUpdateSchema,
  LoginSchema,
  RegisterSchema,
  MembersQuerySchema,
  AnalyticsQuerySchema,
  KickMemberSchema
} from '../validation';

describe('VerifyRequestSchema', () => {
  const validPayload = {
    telegramId: '123456789',
    publicKey: 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy',
    signature: Array(64).fill(1),
    message: 'A'.repeat(60)
  };

  it('accepts valid payload', () => {
    expect(() => VerifyRequestSchema.parse(validPayload)).not.toThrow();
  });

  it('rejects non-numeric telegram ID', () => {
    expect(() => VerifyRequestSchema.parse({ ...validPayload, telegramId: 'abc' })).toThrow();
  });

  it('rejects short public key', () => {
    expect(() => VerifyRequestSchema.parse({ ...validPayload, publicKey: 'short' })).toThrow();
  });

  it('rejects wrong signature length', () => {
    expect(() => VerifyRequestSchema.parse({ ...validPayload, signature: Array(32).fill(1) })).toThrow();
  });

  it('rejects short message', () => {
    expect(() => VerifyRequestSchema.parse({ ...validPayload, message: 'short' })).toThrow();
  });

  it('rejects signature values outside 0-255', () => {
    expect(() => VerifyRequestSchema.parse({ ...validPayload, signature: Array(64).fill(256) })).toThrow();
  });
});

describe('SettingsUpdateSchema', () => {
  const validSettings = {
    groupId: '550e8400-e29b-41d4-a716-446655440000',
    bronzeThreshold: 300,
    silverThreshold: 500,
    goldThreshold: 700,
    autoKickEnabled: true
  };

  it('accepts valid settings', () => {
    expect(() => SettingsUpdateSchema.parse(validSettings)).not.toThrow();
  });

  it('rejects bronze >= silver', () => {
    expect(() => SettingsUpdateSchema.parse({
      ...validSettings,
      bronzeThreshold: 500,
      silverThreshold: 500
    })).toThrow();
  });

  it('rejects silver >= gold', () => {
    expect(() => SettingsUpdateSchema.parse({
      ...validSettings,
      silverThreshold: 700,
      goldThreshold: 700
    })).toThrow();
  });

  it('rejects invalid groupId', () => {
    expect(() => SettingsUpdateSchema.parse({ ...validSettings, groupId: 'not-a-uuid' })).toThrow();
  });

  it('accepts partial threshold updates', () => {
    expect(() => SettingsUpdateSchema.parse({
      groupId: validSettings.groupId,
      bronzeThreshold: 200
    })).not.toThrow();
  });

  it('rejects thresholds outside 0-1000', () => {
    expect(() => SettingsUpdateSchema.parse({
      ...validSettings,
      goldThreshold: 1500
    })).toThrow();
  });
});

describe('LoginSchema', () => {
  it('accepts valid login', () => {
    expect(() => LoginSchema.parse({ email: 'admin@test.com', password: 'password123' })).not.toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => LoginSchema.parse({ email: 'not-email', password: 'password123' })).toThrow();
  });

  it('rejects short password', () => {
    expect(() => LoginSchema.parse({ email: 'admin@test.com', password: '12345' })).toThrow();
  });
});

describe('RegisterSchema', () => {
  const validRegister = {
    token: 'a'.repeat(64),
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'password123'
  };

  it('accepts valid registration', () => {
    expect(() => RegisterSchema.parse(validRegister)).not.toThrow();
  });

  it('rejects wrong token length', () => {
    expect(() => RegisterSchema.parse({ ...validRegister, token: 'short' })).toThrow();
  });

  it('rejects empty name', () => {
    expect(() => RegisterSchema.parse({ ...validRegister, name: '' })).toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => RegisterSchema.parse({ ...validRegister, email: 'bad' })).toThrow();
  });
});

describe('MembersQuerySchema', () => {
  it('accepts valid query with all params', () => {
    expect(() => MembersQuerySchema.parse({
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      page: '1',
      limit: '50',
      search: 'alice',
      tier: 'gold',
      sortBy: 'fairscore',
      sortOrder: 'desc'
    })).not.toThrow();
  });

  it('accepts minimal query (groupId only)', () => {
    expect(() => MembersQuerySchema.parse({
      groupId: '550e8400-e29b-41d4-a716-446655440000'
    })).not.toThrow();
  });

  it('rejects invalid tier', () => {
    expect(() => MembersQuerySchema.parse({
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      tier: 'diamond'
    })).toThrow();
  });

  it('rejects invalid sortBy', () => {
    expect(() => MembersQuerySchema.parse({
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      sortBy: 'name'
    })).toThrow();
  });
});

describe('AnalyticsQuerySchema', () => {
  it('accepts valid period', () => {
    expect(() => AnalyticsQuerySchema.parse({
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      period: '30d'
    })).not.toThrow();
  });

  it('rejects invalid period', () => {
    expect(() => AnalyticsQuerySchema.parse({
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      period: '1y'
    })).toThrow();
  });
});

describe('KickMemberSchema', () => {
  it('accepts valid kick request', () => {
    expect(() => KickMemberSchema.parse({
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      memberId: '550e8400-e29b-41d4-a716-446655440001'
    })).not.toThrow();
  });

  it('accepts optional reason', () => {
    expect(() => KickMemberSchema.parse({
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      memberId: '550e8400-e29b-41d4-a716-446655440001',
      reason: 'Spam'
    })).not.toThrow();
  });

  it('rejects invalid memberId', () => {
    expect(() => KickMemberSchema.parse({
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      memberId: 'not-a-uuid'
    })).toThrow();
  });
});
