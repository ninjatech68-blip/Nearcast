import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The remote casts layer, against a mocked client. What these guard is
 * mostly one rule: the device renders the reason the server generated
 * and never writes one of its own.
 */

const mockGetSupabase = vi.fn();

vi.mock('@/infrastructure/supabase/client', () => ({
  getSupabase: () => mockGetSupabase(),
  isBackendConfigured: () => mockGetSupabase() !== null,
}));

const { coarseWindow, fetchFeed, hideCast, publishCast, remoteEnabled, toCastDetail } =
  await import('./remote');

const row = {
  intent_id: 'cast-1',
  category: 'sports',
  statement: 'badminton after work.',
  area: 'indiranagar',
  starts_at: null,
  expires_at: new Date(Date.now() + 3 * 3_600_000).toISOString(),
  caster_id: 'aarav',
  caster_first_name: 'Aarav',
  reason_text: "near you in indiranagar · you're into sports",
  signals: ['near you in indiranagar', "you're into sports"],
  score: 2,
  distance_m: 1250,
};

beforeEach(() => mockGetSupabase.mockReset());

describe('coarseWindow', () => {
  it('names the window from the LOCAL start time', () => {
    // wednesday 19:00 local
    expect(coarseWindow(new Date(2026, 8, 2, 19, 0))).toBe('weekday-evening');
    // saturday 09:00 local
    expect(coarseWindow(new Date(2026, 8, 5, 9, 0))).toBe('weekend-morning');
    expect(coarseWindow(new Date(2026, 8, 5, 23, 30))).toBe('weekend-night');
  });

  it('is null when the plan has no start time', () => {
    expect(coarseWindow(null)).toBeNull();
  });
});

describe('toCastDetail', () => {
  it('shows the reason the server stored, verbatim', () => {
    const cast = toCastDetail(row)!;
    expect(cast.why).toBe("near you in indiranagar · you're into sports");
    expect(cast.signals).toEqual(['near you in indiranagar', "you're into sports"]);
  });

  it('shows NO reason rather than inventing one when the row carries none', () => {
    const cast = toCastDetail({ ...row, reason_text: null, signals: null })!;
    expect(cast.why).toBe('');
    expect(cast.signals).toEqual([]);
  });

  it('drops a row whose category we do not know instead of guessing', () => {
    expect(toCastDetail({ ...row, category: 'crypto' })).toBeNull();
  });

  it('phrases the distance the server measured', () => {
    expect(toCastDetail(row)!.distance).toBe('1.3 km away');
  });

  it('leaves the distance unset when the server could not measure one', () => {
    // the poster then falls back to the place name rather than guessing
    expect(toCastDetail({ ...row, distance_m: null })!.distance).toBeUndefined();
  });
});

describe('publishCast', () => {
  function clientWithRpc(rpc: ReturnType<typeof vi.fn>) {
    mockGetSupabase.mockReturnValue({ rpc });
    return rpc;
  }

  const base = {
    category: 'sports' as const,
    text: 'badminton after work.',
    area: 'indiranagar',
    radiusKm: 5,
    expiresAt: new Date('2026-09-02T18:00:00.000Z'),
  };

  it('omits the pin entirely when the picker could not place the area', async () => {
    const rpc = clientWithRpc(vi.fn(async () => ({ data: { id: 'new-1' }, error: null })));
    await publishCast({ ...base, latitude: null, longitude: null, startsAt: null });

    const args = rpc.mock.calls[0][1];
    expect(args).not.toHaveProperty('area_latitude');
    expect(args).not.toHaveProperty('cast_starts_at');
    expect(args.cast_radius_km).toBe(5);
  });

  it('sends the pin and the derived window when it could', async () => {
    const rpc = clientWithRpc(vi.fn(async () => ({ data: { id: 'new-1' }, error: null })));
    await publishCast({
      ...base,
      latitude: 12.9784,
      longitude: 77.6408,
      startsAt: new Date(2026, 8, 2, 19, 0),
    });

    const args = rpc.mock.calls[0][1];
    expect(args.area_latitude).toBe(12.9784);
    expect(args.cast_coarse_window).toBe('weekday-evening');
  });

  it('throws when the server refuses, so the screen renders its failure', async () => {
    clientWithRpc(vi.fn(async () => ({ data: null, error: { message: 'radius_out_of_range' } })));
    await expect(
      publishCast({ ...base, latitude: null, longitude: null, startsAt: null }),
    ).rejects.toThrow(/radius_out_of_range/);
  });

  it('throws on a success-shaped response that published nothing', async () => {
    clientWithRpc(vi.fn(async () => ({ data: null, error: null })));
    await expect(
      publishCast({ ...base, latitude: null, longitude: null, startsAt: null }),
    ).rejects.toThrow();
  });
});

describe('fetchFeed', () => {
  it('is empty, not an error, when there is no backend', async () => {
    mockGetSupabase.mockReturnValue(null);
    expect(remoteEnabled()).toBe(false);
    expect(await fetchFeed()).toEqual([]);
  });

  it('maps delivered rows and drops ones it cannot render', async () => {
    mockGetSupabase.mockReturnValue({
      rpc: vi.fn(async () => ({ data: [row, { ...row, intent_id: 'x', category: 'crypto' }], error: null })),
    });
    const feed = await fetchFeed();
    expect(feed).toHaveLength(1);
    expect(feed[0].id).toBe('cast-1');
  });

  it('throws rather than showing an empty feed when the read fails', async () => {
    // an empty feed and a broken feed must never look the same
    mockGetSupabase.mockReturnValue({ rpc: vi.fn(async () => ({ data: null, error: { message: 'boom' } })) });
    await expect(fetchFeed()).rejects.toThrow(/boom/);
  });
});

describe('hideCast', () => {
  it('passes the stronger not-relevant signal through', async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    mockGetSupabase.mockReturnValue({ rpc });
    await hideCast('cast-1', true);
    expect(rpc).toHaveBeenCalledWith('hide_cast', { target_intent_id: 'cast-1', not_relevant: true });
  });
});
