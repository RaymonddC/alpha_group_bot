import { vi } from 'vitest';
import jwt from 'jsonwebtoken';

// --- Constants ---
export const TEST_JWT_SECRET = 'test-secret-for-vitest';
export const TEST_CRON_SECRET = 'test-cron-secret-for-vitest';
export const TEST_ADMIN_ID = 'test-admin-id';
export const TEST_GROUP_ID = 'test-group-id';

// --- JWT helper ---
export function generateTestToken(
  adminId: string = TEST_ADMIN_ID,
  email = 'test@example.com'
): string {
  return jwt.sign(
    { adminId, email, type: 'admin' },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// --- Chainable Supabase mock ---
export function chainable(resolveValue: { data?: any; error?: any; count?: any } = { data: null, error: null }) {
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

// --- Mock Supabase factory ---
export function createMockSupabase() {
  const mockFrom = vi.fn();
  return { mockFrom, supabase: { from: (...args: any[]) => mockFrom(...args) } };
}
