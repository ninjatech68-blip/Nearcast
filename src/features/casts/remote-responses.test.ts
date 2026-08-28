import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSupabase = vi.fn();
vi.mock('@/infrastructure/supabase/client', () => ({
  getSupabase: () => mockGetSupabase(),
  isBackendConfigured: () => mockGetSupabase() !== null,
}));

const {
  respondToCast,
  acceptResponse,
  declineResponse,
  withdrawResponse,
  fetchPendingJoins,
  fetchSentJoins,
} = await import('./remote-responses');

function withRpc(impl: (name: string, args: unknown) => { data?: unknown; error?: unknown }) {
  const rpc = vi.fn(async (name: string, args: unknown) => impl(name, args));
  mockGetSupabase.mockReturnValue({ rpc });
  return rpc;
}

beforeEach(() => mockGetSupabase.mockReset());

describe('respondToCast', () => {
  it('returns the response id on success', async () => {
    withRpc(() => ({ data: 'resp-1', error: null }));
    expect(await respondToCast('cast-1', 'in!')).toBe('resp-1');
  });

  it('throws a readable error so the join screen can retry', async () => {
    withRpc(() => ({ data: null, error: { message: 'blocked_relationship' } }));
    await expect(respondToCast('cast-1', 'in!')).rejects.toThrow(/blocked/);
  });

  it('throws when there is no backend, rather than pretending it sent', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(respondToCast('cast-1', 'in!')).rejects.toThrow();
  });
});

describe('accept / decline / withdraw', () => {
  it('accept passes the response id and the expected live status', async () => {
    const rpc = withRpc(() => ({ error: null }));
    await acceptResponse('resp-1');
    expect(rpc).toHaveBeenCalledWith('accept_response', {
      response_to_accept: 'resp-1',
      expected_intent_status: 'live',
    });
  });

  it('accept surfaces a full cast as an error, not a silent success', async () => {
    withRpc(() => ({ error: { message: 'cast_is_full' } }));
    await expect(acceptResponse('resp-1')).rejects.toThrow(/full/);
  });

  it('decline targets the response id', async () => {
    const rpc = withRpc(() => ({ error: null }));
    await declineResponse('resp-9');
    expect(rpc).toHaveBeenCalledWith('decline_response', { target_response_id: 'resp-9' });
  });

  it('withdraw targets the response id', async () => {
    const rpc = withRpc(() => ({ error: null }));
    await withdrawResponse('resp-9');
    expect(rpc).toHaveBeenCalledWith('withdraw_response', { target_response_id: 'resp-9' });
  });
});

describe('reads', () => {
  it('returns [] with no backend instead of throwing', async () => {
    mockGetSupabase.mockReturnValue(null);
    expect(await fetchPendingJoins()).toEqual([]);
    expect(await fetchSentJoins()).toEqual([]);
  });

  it('passes rows through for the store to shape', async () => {
    withRpc((name) =>
      name === 'pending_joins_on_my_casts'
        ? { data: [{ response_id: 'r1', joiner_first_name: 'Riya' }], error: null }
        : { data: [], error: null },
    );
    const rows = await fetchPendingJoins();
    expect(rows[0].response_id).toBe('r1');
  });

  it('throws when a read fails, so the caller can tell empty from broken', async () => {
    withRpc(() => ({ data: null, error: { message: 'boom' } }));
    await expect(fetchSentJoins()).rejects.toThrow(/boom/);
  });
});
