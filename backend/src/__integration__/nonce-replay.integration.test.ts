process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/alpha_groups_test';

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { supabase } from '../db/client';
import { truncateAll, closeTestPool } from './fixtures';

describe('nonce replay prevention integration', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('first nonce use succeeds (insert into used_nonces table)', async () => {
    const nonce = 'test-nonce-unique-001';
    const telegramId = '12345';

    const { error } = await supabase.from('used_nonces').insert({
      nonce,
      telegram_id: telegramId,
    });

    expect(error).toBeNull();

    // Verify it exists
    const { data } = await supabase
      .from('used_nonces')
      .select('nonce')
      .eq('nonce', nonce)
      .single();

    expect(data).not.toBeNull();
    expect(data.nonce).toBe(nonce);
  });

  it('second use of same nonce is rejected (select finds it)', async () => {
    const nonce = 'test-nonce-replay-002';
    const telegramId = '12345';

    // First insert
    await supabase.from('used_nonces').insert({
      nonce,
      telegram_id: telegramId,
    });

    // Simulate replay detection: check if nonce already exists
    const { data: nonceExists } = await supabase
      .from('used_nonces')
      .select('nonce')
      .eq('nonce', nonce)
      .single();

    expect(nonceExists).not.toBeNull();
    expect(nonceExists.nonce).toBe(nonce);

    // A second insert with the same nonce should fail (unique constraint)
    const { error } = await supabase.from('used_nonces').insert({
      nonce,
      telegram_id: telegramId,
    });

    expect(error).not.toBeNull();
  });

  it('different nonces both succeed', async () => {
    const nonce1 = 'test-nonce-alpha-003';
    const nonce2 = 'test-nonce-beta-003';
    const telegramId = '12345';

    const { error: err1 } = await supabase.from('used_nonces').insert({
      nonce: nonce1,
      telegram_id: telegramId,
    });
    expect(err1).toBeNull();

    const { error: err2 } = await supabase.from('used_nonces').insert({
      nonce: nonce2,
      telegram_id: telegramId,
    });
    expect(err2).toBeNull();

    // Both should exist
    const { data: found1 } = await supabase
      .from('used_nonces')
      .select('nonce')
      .eq('nonce', nonce1)
      .single();
    expect(found1).not.toBeNull();

    const { data: found2 } = await supabase
      .from('used_nonces')
      .select('nonce')
      .eq('nonce', nonce2)
      .single();
    expect(found2).not.toBeNull();
  });

  it('nonce stored with correct telegram_id', async () => {
    const nonce = 'test-nonce-tid-004';
    const telegramId = '99887766';

    await supabase.from('used_nonces').insert({
      nonce,
      telegram_id: telegramId,
    });

    const { data } = await supabase
      .from('used_nonces')
      .select('*')
      .eq('nonce', nonce)
      .single();

    expect(data).not.toBeNull();
    expect(data.telegram_id).toBe(telegramId);
    expect(data.nonce).toBe(nonce);
  });
});
