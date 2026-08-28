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
  deletes: { table: string; notIn: string | null }[];
};

function clientWithSession(userId: string | null): { client: unknown; log: Recorder } {
  const log: Recorder = { upserts: [], deletes: [] };

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

    const profile = log.upserts.find((u) => u.table === 'profiles');
    expect(profile?.rows).toMatchObject({
      id: 'uid-1',
      display_name: 'Piyush Sharma',
      active_windows: ['weekday-evening'],
    });
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
      from: () => ({ upsert: async () => ({ error: { message: 'rls denied' } }) }),
    });
    await expect(syncProfile({ ...snapshot, interests: [] })).rejects.toThrow(/rls denied/);
  });
});
