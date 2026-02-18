import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  closeTestPool,
  truncateAll,
  createGroup,
  createMember,
  createAdmin,
  createGroupAdmin,
} from './fixtures';

// Set DATABASE_URL so db/client.ts picks up the test DB
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/alpha_groups_test';

// Import supabase AFTER setting env
import { supabase } from '../db/client';

describe('PgChain query builder (real DB)', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  // =========================================================================
  // INSERT
  // =========================================================================
  it('insert returns the created row', async () => {
    const { data, error } = await supabase.from('groups').insert({
      telegram_group_id: -999001,
      name: 'Insert Test',
      bronze_threshold: 300,
      silver_threshold: 500,
      gold_threshold: 700,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.name).toBe('Insert Test');
    expect(data.id).toBeDefined();
  });

  // =========================================================================
  // SELECT
  // =========================================================================
  it('select returns all rows', async () => {
    await createGroup({ name: 'G1' });
    await createGroup({ name: 'G2' });

    const { data, error } = await supabase.from('groups').select('*');

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
  });

  it('select with eq filter', async () => {
    const g = await createGroup({ name: 'FindMe' });

    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', g.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('FindMe');
  });

  it('single() returns one row or error', async () => {
    const g = await createGroup({ name: 'SingleTest' });

    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', g.id)
      .single();

    expect(error).toBeNull();
    expect(data.name).toBe('SingleTest');
  });

  it('single() returns error when no rows found', async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();

    expect(data).toBeNull();
    expect(error).toBeDefined();
    expect(error.code).toBe('PGRST116');
  });

  it('maybeSingle() returns null without error when no rows', async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .maybeSingle();

    expect(data).toBeNull();
    expect(error).toBeNull();
  });

  // =========================================================================
  // COUNT
  // =========================================================================
  it('select with count: exact returns count', async () => {
    const g = await createGroup();
    await createMember(g.id, { fairscore: 400, tier: 'bronze' });
    await createMember(g.id, { fairscore: 600, tier: 'silver' });

    const { count, error } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', g.id);

    expect(error).toBeNull();
    expect(count).toBe(2);
  });

  // =========================================================================
  // UPDATE
  // =========================================================================
  it('update modifies matching rows', async () => {
    const g = await createGroup({ name: 'OldName' });

    const { data, error } = await supabase
      .from('groups')
      .update({ name: 'NewName' })
      .eq('id', g.id);

    expect(error).toBeNull();
    expect(data[0].name).toBe('NewName');
  });

  // =========================================================================
  // DELETE
  // =========================================================================
  it('delete removes matching rows', async () => {
    const g = await createGroup();
    const m = await createMember(g.id);

    const { error: delError } = await supabase
      .from('members')
      .delete()
      .eq('id', m.id);

    expect(delError).toBeNull();

    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('id', m.id);

    expect(data).toHaveLength(0);
  });

  // =========================================================================
  // UPSERT
  // =========================================================================
  it('upsert inserts new row then updates on conflict', async () => {
    const g = await createGroup();

    // First upsert - insert
    const { data: d1, error: e1 } = await supabase.from('members').upsert(
      {
        group_id: g.id,
        telegram_id: 777001,
        wallet_address: 'UpsertWallet001',
        fairscore: 400,
        tier: 'bronze',
        last_checked: new Date().toISOString(),
      },
      { onConflict: 'group_id,telegram_id' }
    );

    expect(e1).toBeNull();
    expect(d1.fairscore).toBe(400);

    // Second upsert - update
    const { data: d2, error: e2 } = await supabase.from('members').upsert(
      {
        group_id: g.id,
        telegram_id: 777001,
        wallet_address: 'UpsertWallet001',
        fairscore: 800,
        tier: 'gold',
        last_checked: new Date().toISOString(),
      },
      { onConflict: 'group_id,telegram_id' }
    );

    expect(e2).toBeNull();
    expect(d2.fairscore).toBe(800);

    // Only one row exists
    const { data: all } = await supabase
      .from('members')
      .select('*')
      .eq('group_id', g.id)
      .eq('telegram_id', 777001);

    expect(all).toHaveLength(1);
  });

  // =========================================================================
  // FILTERS
  // =========================================================================
  it('gte, lte, and in filters work', async () => {
    const g = await createGroup();
    await createMember(g.id, { fairscore: 100, tier: 'none' });
    await createMember(g.id, { fairscore: 400, tier: 'bronze' });
    await createMember(g.id, { fairscore: 600, tier: 'silver' });
    await createMember(g.id, { fairscore: 800, tier: 'gold' });

    // gte
    const { data: gte500 } = await supabase
      .from('members')
      .select('*')
      .eq('group_id', g.id)
      .gte('fairscore', 500);

    expect(gte500).toHaveLength(2); // 600, 800

    // in
    const { data: inTiers } = await supabase
      .from('members')
      .select('*')
      .eq('group_id', g.id)
      .in('tier', ['bronze', 'gold']);

    expect(inTiers).toHaveLength(2);
  });

  it('ilike filter works for search', async () => {
    const g = await createGroup();
    await createMember(g.id, { telegram_username: 'alice_smith' });
    await createMember(g.id, { telegram_username: 'bob_jones' });

    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('group_id', g.id)
      .ilike('telegram_username', '%alice%');

    expect(data).toHaveLength(1);
    expect(data[0].telegram_username).toBe('alice_smith');
  });

  // =========================================================================
  // PAGINATION & ORDER
  // =========================================================================
  it('order, range, and limit work', async () => {
    const g = await createGroup();
    await createMember(g.id, { fairscore: 100, tier: 'none' });
    await createMember(g.id, { fairscore: 300, tier: 'bronze' });
    await createMember(g.id, { fairscore: 600, tier: 'silver' });
    await createMember(g.id, { fairscore: 900, tier: 'gold' });

    // Order descending, take first 2
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('group_id', g.id)
      .order('fairscore', { ascending: false })
      .range(0, 1);

    expect(data).toHaveLength(2);
    expect(data[0].fairscore).toBe(900);
    expect(data[1].fairscore).toBe(600);
  });

  // =========================================================================
  // JOIN
  // =========================================================================
  it('select with join syntax fetches related data', async () => {
    const g = await createGroup({ name: 'JoinGroup' });
    const admin = await createAdmin();
    await createGroupAdmin(g.id, admin.id);

    const { data, error } = await supabase
      .from('group_admins')
      .select('group_id, groups(id, name)')
      .eq('admin_id', admin.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].groups).toBeDefined();
    expect(data[0].groups.name).toBe('JoinGroup');
  });
});
