import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockFrom = vi.fn();

vi.mock('../../db/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

// Mock rate-limiter
const mockSendHTMLMessage = vi.fn().mockResolvedValue(undefined);
vi.mock('../rate-limiter', () => ({
  sendHTMLMessage: (...args: any[]) => mockSendHTMLMessage(...args),
}));

// Mock logger
vi.mock('../../services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { handleAdmin } from '../handlers';

/**
 * Build a chainable supabase query mock.
 * Pass `resolveValue` to set what the terminal call resolves to.
 */
function chainable(resolveValue: { data?: any; error?: any } = { data: null, error: null }) {
  const resolved = Promise.resolve(resolveValue);
  const chain: any = new Proxy(
    { then: resolved.then.bind(resolved), catch: resolved.catch.bind(resolved) },
    {
      get(target, prop) {
        if (prop === 'then' || prop === 'catch') return (target as any)[prop];
        if (prop === 'single' || prop === 'maybeSingle') {
          return vi.fn().mockReturnValue(Promise.resolve(resolveValue));
        }
        if (prop === 'insert') {
          return vi.fn().mockReturnValue(Promise.resolve(resolveValue));
        }
        return vi.fn().mockReturnValue(chain);
      },
    }
  );
  return chain;
}

function makeMsg(overrides: Partial<any> = {}): any {
  return {
    chat: { id: -1001234567890, type: 'supergroup' },
    from: { id: 111222333, username: 'testadmin' },
    ...overrides,
  };
}

function makeBot(memberStatus = 'administrator'): any {
  return {
    getChatMember: vi.fn().mockResolvedValue({ status: memberStatus }),
  };
}

describe('handleAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects private chats', async () => {
    const bot = makeBot();
    const msg = makeMsg({ chat: { id: 111, type: 'private' } });

    await handleAdmin(bot, msg);

    expect(mockSendHTMLMessage).toHaveBeenCalledWith(
      bot,
      111,
      'Use /admin in a group chat, not in private messages.'
    );
  });

  it('rejects non-admin users', async () => {
    const bot = makeBot('member');
    const msg = makeMsg();

    await handleAdmin(bot, msg);

    expect(mockSendHTMLMessage).toHaveBeenCalledWith(
      bot,
      msg.chat.id,
      'Only group admins can use this command.'
    );
  });

  it('returns login link when user already registered as admin for this group', async () => {
    const bot = makeBot('creator');
    const msg = makeMsg();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'groups') {
        return chainable({
          data: { id: 'group-uuid-1', telegram_group_id: -1001234567890, name: 'Test' },
          error: null,
        });
      }
      if (table === 'admin_registration_tokens') {
        // First call: tokens for this user + this group — has a used token
        return chainable({
          data: [{ id: 'token-1', used_at: '2026-01-01T00:00:00Z', group_id: 'group-uuid-1' }],
          error: null,
        });
      }
      return chainable();
    });

    await handleAdmin(bot, msg);

    expect(mockSendHTMLMessage).toHaveBeenCalledTimes(1);
    const sentMessage = mockSendHTMLMessage.mock.calls[0][2];
    expect(sentMessage).toContain('Admin Dashboard');
    expect(sentMessage).toContain('already have an admin account');
  });

  it('auto-links existing admin account when using /admin in a new group', async () => {
    const bot = makeBot('administrator');
    const msg = makeMsg();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'groups') {
        return chainable({
          data: { id: 'group-uuid-2', telegram_group_id: -1001234567890, name: 'Group B' },
          error: null,
        });
      }
      if (table === 'admin_registration_tokens') {
        // No used tokens for this user + group B
        return chainable({ data: [], error: null });
      }
      if (table === 'admins') {
        // This telegram user already has an admin account (registered via group A)
        return chainable({
          data: { id: 'admin-uuid-1' },
          error: null,
        });
      }
      if (table === 'group_admins') {
        return chainable({ error: null });
      }
      return chainable();
    });

    await handleAdmin(bot, msg);

    expect(mockSendHTMLMessage).toHaveBeenCalledTimes(1);
    const sentMessage = mockSendHTMLMessage.mock.calls[0][2];
    expect(sentMessage).toContain('has been linked');
    expect(sentMessage).toContain('Group B');
    expect(sentMessage).not.toContain('Admin Registration');
  });

  it('generates registration token for brand-new admin', async () => {
    const bot = makeBot('administrator');
    const msg = makeMsg({ from: { id: 999888777, username: 'newadmin' } });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'groups') {
        return chainable({
          data: { id: 'group-uuid-1', telegram_group_id: -1001234567890, name: 'Test' },
          error: null,
        });
      }
      if (table === 'admin_registration_tokens') {
        // No tokens for this user at all — brand new
        return chainable({ data: [], error: null });
      }
      if (table === 'admins') {
        // No admin account for this telegram user
        return chainable({ data: null, error: null });
      }
      return chainable();
    });

    await handleAdmin(bot, msg);

    expect(mockSendHTMLMessage).toHaveBeenCalledTimes(1);
    const sentMessage = mockSendHTMLMessage.mock.calls[0][2];
    expect(sentMessage).toContain('Admin Registration');
  });

  it('allows second admin to register even when first admin already exists for group', async () => {
    const bot = makeBot('administrator');
    const adminBId = 555666777;
    const msg = makeMsg({ from: { id: adminBId, username: 'adminB' } });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'groups') {
        return chainable({
          data: { id: 'group-uuid-1', telegram_group_id: -1001234567890, name: 'Test' },
          error: null,
        });
      }
      if (table === 'admin_registration_tokens') {
        // Admin B has no tokens anywhere — completely new
        return chainable({ data: [], error: null });
      }
      if (table === 'admins') {
        // Admin B has no admin account
        return chainable({ data: null, error: null });
      }
      return chainable();
    });

    await handleAdmin(bot, msg);

    expect(mockSendHTMLMessage).toHaveBeenCalledTimes(1);
    const sentMessage = mockSendHTMLMessage.mock.calls[0][2];
    expect(sentMessage).toContain('Admin Registration');
    expect(sentMessage).not.toContain('already have an admin account');
  });

  it('handles unregistered group gracefully', async () => {
    const bot = makeBot('creator');
    const msg = makeMsg();

    mockFrom.mockImplementation(() =>
      chainable({ data: null, error: { code: 'PGRST116', message: 'not found' } })
    );

    await handleAdmin(bot, msg);

    expect(mockSendHTMLMessage).toHaveBeenCalledWith(
      bot,
      msg.chat.id,
      'This group is not registered. Remove and re-add the bot.'
    );
  });
});
