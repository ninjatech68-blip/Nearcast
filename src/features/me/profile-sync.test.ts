import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Profile sync, against a mocked client. The rule these guard is that
 * areas and interests are REPLACED, not merged: removing one on the
 * device has to remove it here, or a neighbourhood you left keeps
 * delivering to you.
 */

const mockGetSupabase = vi.fn();

vi.mock('@/infrastructure/supabase/client', () => ({
  getSupabase: () => mockGetSupabase(),
}));

const { syncProfile } = await import('./profile-sync');

type Recorder = {
  upserts: { table: string; rows: unknown }[];
  updates: { table: string; values: Record<string, unknown>; id: string | null }[];
  deletes: { table: string; notIn: string | null }[];
};

/**
 * `isMember` decides whether the profile UPDATE matches a row. It is the
 * difference between a member whose profile is being mirrored and an
 * account that never redeemed an invitation, which sync must not create.
 */
function clientWithSession(
  userId: string | null,
  isMember = true,
): { client: unknown; log: Recorder } {
  const log: Recorder = { upserts: [], updates: [], deletes: [] };

  const client = {
    auth: {
      getSession: async () => ({ data: { session: userId ? { user: { id: userId } } : null } }),
    },
    from(table: string) {
      return {
        upsert: async (rows: unknown) => {
          log.upserts.push({ table, rows });
          return { error: null };
        },
        update: (values: Record<string, unknown>) => ({
          eq: (_column: string, id: string) => ({
            select: async () => {
              log.updates.push({ table, values, id });
              return { data: isMember ? [{ id }] : [], error: null };
            },
          }),
        }),
        delete: () => {
          const chain = {
            eq: () => chain,
            not: (_column: string, _op: string, value: string) => {
              log.deletes.push({ table, notIn: value });
              return Promise.resolve({ error: null });
            },
          };
          return chain;
        },
      };
    },
  };
  return { client, log };
}

beforeEach(() => mockGetSupabase.mockReset());

describe('syncProfile', () => {
  const snapshot = {
    name: '  Piyush Sharma ',
    approvedAreas: ['indiranagar', 'koramangala'],
    interests: ['sports', 'arts'] as const,
    activeWindows: ['weekday-evening'],
  };

  it('does nothing, and says so, when there is no backend', async () => {
    mockGetSupabase.mockReturnValue(null);
    expect(await syncProfile({ ...snapshot, interests: [] })).toBe(false);
  });

  it('does nothing when nobody is signed in', async () => {
    const { client } = clientWithSession(null);
    mockGetSupabase.mockReturnValue(client);
    expect(await syncProfile({ ...snapshot, interests: [] })).toBe(false);
  });

  it('writes the trimmed name and the coarse windows', async () => {
    const { client, log } = clientWithSession('uid-1');
    mockGetSupabase.mockReturnValue(client);
    await syncProfile({ ...snapshot, interests: [...snapshot.interests] });

    const profile = log.updates.find((u) => u.table === 'profiles');
    expect(profile?.id).toBe('uid-1');
    expect(profile?.values).toMatchObject({
      display_name: 'Piyush Sharma',
      active_windows: ['weekday-evening'],
    });
  });

  /**
   * Membership is created by redeeming an invitation and by nothing else.
   * Sync used to upsert, which made mirroring a profile a way to join.
   */
  it('never creates a profile, so it cannot grant membership', async () => {
    const { client, log } = clientWithSession('uid-1');
    mockGetSupabase.mockReturnValue(client);
    await syncProfile({ ...snapshot, interests: [] });

    expect(log.upserts.some((u) => u.table === 'profiles')).toBe(false);
    expect(log.updates.some((u) => u.table === 'profiles')).toBe(true);
  });

  it('stops, without throwing, when the account is not a member yet', async () => {
    const { client, log } = clientWithSession('uid-1', false);
    mockGetSupabase.mockReturnValue(client);

    expect(await syncProfile({ ...snapshot, interests: [] })).toBe(false);
    // and it does not go on to write areas or interests for a non-member
    expect(log.upserts).toHaveLength(0);
  });

  it('prefers the point the picker resolved over the seeded fallback', async () => {
    const { client, log } = clientWithSession('uid-1');
    mockGetSupabase.mockReturnValue(client);
    await syncProfile({
      ...snapshot,
      approvedAreas: ['indiranagar'],
      // a real pin, different from the seeded centroid for that name
      areaPoints: { indiranagar: { latitude: 12.9, longitude: 77.6 } },
      interests: [...snapshot.interests],
    });

    const areas = log.upserts.find((u) => u.table === 'profile_areas')?.rows as {
      name: string;
      centroid: string | null;
    }[];
    expect(areas[0].centroid).toBe('SRID=4326;POINT(77.6 12.9)');
  });

  it('places an area the picker resolved even when we have no fixture for it', async () => {
    const { client, log } = clientWithSession('uid-1');
    mockGetSupabase.mockReturnValue(client);
    await syncProfile({
      ...snapshot,
      approvedAreas: ['gulmohar trends'],
      areaPoints: { 'gulmohar trends': { latitude: 30.65, longitude: 76.82 } },
      interests: [],
    });

    const areas = log.upserts.find((u) => u.table === 'profile_areas')?.rows as {
      name: string;
      centroid: string | null;
    }[];
    // this is the whole point of the picker: a place nobody hardcoded
    // still gets a real centroid, so radius delivery works for it.
    expect(areas[0].centroid).toBe('SRID=4326;POINT(76.82 30.65)');
  });

  it('stores a centroid for an area it can place, and the name alone when it cannot', async () => {
    const { client, log } = clientWithSession('uid-1');
    mockGetSupabase.mockReturnValue(client);
    await syncProfile({
      ...snapshot,
      approvedAreas: ['indiranagar', 'gulmohar trends'],
      interests: [...snapshot.interests],
    });

    const areas = log.upserts.find((u) => u.table === 'profile_areas')?.rows as {
      name: string;
      centroid: string | null;
    }[];
    expect(areas.find((a) => a.name === 'indiranagar')?.centroid).toMatch(/^SRID=4326;POINT\(/);
    // an area we cannot place keeps its name; delivery falls back to
    // matching that rather than silently going quiet.
    expect(areas.find((a) => a.name === 'gulmohar trends')?.centroid).toBeNull();
  });

  it('deletes the areas and interests that are no longer picked', async () => {
    const { client, log } = clientWithSession('uid-1');
    mockGetSupabase.mockReturnValue(client);
    await syncProfile({ ...snapshot, interests: [...snapshot.interests] });

    const areaDelete = log.deletes.find((d) => d.table === 'profile_areas');
    expect(areaDelete?.notIn).toContain('indiranagar');
    expect(areaDelete?.notIn).toContain('koramangala');

    const interestDelete = log.deletes.find((d) => d.table === 'profile_interests');
    expect(interestDelete?.notIn).toBe('(sports,arts)');
  });

  it('surfaces a failed write instead of reporting success', async () => {
    mockGetSupabase.mockReturnValue({
      auth: { getSession: async () => ({ data: { session: { user: { id: 'uid-1' } } } }) },
      from: () => ({
        update: () => ({
          eq: () => ({
            select: async () => ({ data: null, error: { message: 'rls denied' } }),
          }),
        }),
      }),
    });
    await expect(syncProfile({ ...snapshot, interests: [] })).rejects.toThrow(/rls denied/);
  });
});
