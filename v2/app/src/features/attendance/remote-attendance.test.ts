import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSupabase = vi.fn();
vi.mock('@/infrastructure/supabase/client', () => ({
  getSupabase: () => mockGetSupabase(),
}));

const { reportPresenceRemote, fetchPlansToReport, fetchSharedHistory, attendanceEnabled } =
  await import('./remote-attendance');

function withRpc(impl: (name: string, args: unknown) => { data?: unknown; error?: unknown }) {
  const rpc = vi.fn(async (name: string, args: unknown) => impl(name, args));
  mockGetSupabase.mockReturnValue({ rpc });
  return rpc;
}

beforeEach(() => mockGetSupabase.mockReset());

describe('reportPresenceRemote', () => {
  it("maps the client's 'no-show' to the db enum 'no_show'", async () => {
    const rpc = withRpc(() => ({ error: null }));
    await reportPresenceRemote('i1', 's1', 'no-show');
    expect(rpc).toHaveBeenCalledWith('report_presence', {
      target_intent: 'i1',
      subject: 's1',
      report: 'no_show',
    });
  });

  it("passes 'showed' through", async () => {
    const rpc = withRpc(() => ({ error: null }));
    await reportPresenceRemote('i1', 's1', 'showed');
    expect((rpc.mock.calls[0][1] as { report: string }).report).toBe('showed');
  });

  it('surfaces a not-a-party error rather than a silent success', async () => {
    withRpc(() => ({ error: { message: 'not_a_party' } }));
    await expect(reportPresenceRemote('i1', 's1', 'showed')).rejects.toThrow(/not_a_party/);
  });
});

describe('reads', () => {
  it('return empties with no backend rather than throwing', async () => {
    mockGetSupabase.mockReturnValue(null);
    expect(attendanceEnabled()).toBe(false);
    expect(await fetchPlansToReport()).toEqual([]);
    expect(await fetchSharedHistory('p1')).toEqual({ plans: 0, receipts: 0, flakes: 0 });
  });

  it('unwraps the single shared-history row', async () => {
    withRpc(() => ({ data: [{ plans: 2, receipts: 1, flakes: 0 }], error: null }));
    expect(await fetchSharedHistory('p1')).toEqual({ plans: 2, receipts: 1, flakes: 0 });
  });

  it('defaults shared history to zeros when the row is missing', async () => {
    withRpc(() => ({ data: [], error: null }));
    expect(await fetchSharedHistory('p1')).toEqual({ plans: 0, receipts: 0, flakes: 0 });
  });

  it('throws when a read fails so empty and broken stay distinct', async () => {
    withRpc(() => ({ data: null, error: { message: 'boom' } }));
    await expect(fetchPlansToReport()).rejects.toThrow(/boom/);
  });
});
