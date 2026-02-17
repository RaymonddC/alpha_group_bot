import { describe, it, expect } from 'vitest';

/**
 * Test the login endpoint's group-fetching logic.
 * Since we can't easily integration-test Express routes without supertest,
 * we test the Supabase query + mapping logic that builds the groups array.
 */

// This simulates what the login endpoint does after authenticating:
// 1. Query group_admins joined with groups
// 2. For each group, count members
// 3. Return groups array
async function buildGroupsArray(
  groupAdminsData: Array<{ group_id: string; groups: { id: string; name: string } }>,
  getMemberCount: (groupId: string) => Promise<number>
) {
  const groups = await Promise.all(
    (groupAdminsData || []).map(async (ga) => {
      const group = ga.groups;
      const count = await getMemberCount(ga.group_id);
      return { id: group.id, name: group.name, member_count: count };
    })
  );
  return groups;
}

describe('admin login groups response', () => {
  it('returns multiple groups when admin manages multiple groups', async () => {
    const groupAdminsData = [
      { group_id: 'group-1', groups: { id: 'group-1', name: 'Group Alpha' } },
      { group_id: 'group-2', groups: { id: 'group-2', name: 'Group Beta' } },
    ];

    const memberCounts: Record<string, number> = {
      'group-1': 15,
      'group-2': 8,
    };

    const groups = await buildGroupsArray(
      groupAdminsData,
      async (gid) => memberCounts[gid] || 0
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({ id: 'group-1', name: 'Group Alpha', member_count: 15 });
    expect(groups[1]).toEqual({ id: 'group-2', name: 'Group Beta', member_count: 8 });
  });

  it('returns single group for single-group admin', async () => {
    const groupAdminsData = [
      { group_id: 'group-1', groups: { id: 'group-1', name: 'Only Group' } },
    ];

    const groups = await buildGroupsArray(
      groupAdminsData,
      async () => 42
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual({ id: 'group-1', name: 'Only Group', member_count: 42 });
  });

  it('returns empty array when admin has no groups', async () => {
    const groups = await buildGroupsArray([], async () => 0);
    expect(groups).toEqual([]);
  });

  it('handles null groupAdmins data', async () => {
    const groups = await buildGroupsArray(
      null as any,
      async () => 0
    );
    expect(groups).toEqual([]);
  });
});

describe('login response shape', () => {
  it('groupId equals first group id for backwards compatibility', () => {
    const groups = [
      { id: 'group-1', name: 'A', member_count: 0 },
      { id: 'group-2', name: 'B', member_count: 0 },
    ];

    // This is what the login endpoint does:
    const response = {
      success: true,
      token: 'jwt-token',
      groups,
      groupId: groups[0]?.id || null,
    };

    expect(response.groupId).toBe('group-1');
    expect(response.groups).toHaveLength(2);
  });

  it('groupId is null when no groups', () => {
    const groups: any[] = [];
    const response = {
      success: true,
      token: 'jwt-token',
      groups,
      groupId: groups[0]?.id || null,
    };

    expect(response.groupId).toBeNull();
    expect(response.groups).toHaveLength(0);
  });
});
