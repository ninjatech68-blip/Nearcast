import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSupabase = vi.fn();
vi.mock('@/infrastructure/supabase/client', () => ({
  getSupabase: () => mockGetSupabase(),
}));

const {
  fetchMyCircles,
  createCircleRemote,
  addToCircleRemote,
  removeFromCircleRemote,
  fetchVouchersOfMe,
  circlesEnabled,
} = await import('./remote-circles');

function withRpc(impl: (name: string, args: unknown) => { data?: unknown; error?: unknown }) {
  const rpc = vi.fn(async (name: string, args: unknown) => impl(name, args));
  mockGetSupabase.mockReturnValue({ rpc });
  return rpc;
}

beforeEach(() => mockGetSupabase.mockReset());

describe('reads', () => {
  it('return empty with no backend, never throw', async () => {
    mockGetSupabase.mockReturnValue(null);
    expect(circlesEnabled()).toBe(false);
    expect(await fetchMyCircles()).toEqual([]);
    expect(await fetchVouchersOfMe()).toEqual([]);
  });

  it('maps voucher rows to names', async () => {
    withRpc(() => ({ data: [{ voucher_first_name: 'Aarav' }, { voucher_first_name: null }], error: null }));
    expect(await fetchVouchersOfMe()).toEqual(['Aarav', 'someone']);
  });

  it('throws when a read fails so empty and broken stay distinct', async () => {
    withRpc(() => ({ data: null, error: { message: 'boom' } }));
    await expect(fetchMyCircles()).rejects.toThrow(/boom/);
  });
});

describe('writes', () => {
  it('create returns the new id', async () => {
    withRpc(() => ({ data: 'circle-1', error: null }));
    expect(await createCircleRemote('crew')).toBe('circle-1');
  });

  it('add surfaces the receipt gate as an error', async () => {
    withRpc(() => ({ error: { message: 'needs_receipt' } }));
    await expect(addToCircleRemote('c1', 'p1')).rejects.toThrow(/needs_receipt/);
  });

  it('add targets the circle and member', async () => {
    const rpc = withRpc(() => ({ error: null }));
    await addToCircleRemote('c1', 'p1');
    expect(rpc).toHaveBeenCalledWith('add_to_circle', { target_circle: 'c1', member: 'p1' });
  });

  it('remove targets the circle and member', async () => {
    const rpc = withRpc(() => ({ error: null }));
    await removeFromCircleRemote('c1', 'p1');
    expect(rpc).toHaveBeenCalledWith('remove_from_circle', { target_circle: 'c1', member: 'p1' });
  });
});
