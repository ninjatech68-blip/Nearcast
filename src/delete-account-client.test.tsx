import { beforeEach, describe, expect, it, jest } from '@jest/globals';

type InvokeResult = { data: unknown; error: unknown };

const mockInvoke = jest.fn<(...a: unknown[]) => Promise<InvokeResult>>();
const mockRpc = jest.fn<(...a: unknown[]) => Promise<unknown>>();

jest.mock('@/infrastructure/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
    rpc: (...a: unknown[]) => mockRpc(...a),
  },
}));

jest.mock('@/infrastructure/analytics/analytics', () => ({ track: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { deleteAccount } = require('@/features/coordination/queries');

describe('deleteAccount', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockRpc.mockReset();
  });

  it('goes through the Edge function, so the session is revoked as well as the data removed', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });

    await expect(deleteAccount()).resolves.toEqual({ ok: true });

    expect(mockInvoke).toHaveBeenCalledWith('delete-account', {
      body: { confirmation: 'DELETE' },
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('keeps the account and says so when the server refuses', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'conflict' } });

    const result = await deleteAccount();

    expect(result.ok).toBe(false);
  });

  it('tells the person plainly when the data went but the session did not', async () => {
    mockInvoke.mockResolvedValue({
      data: { error: 'partially_completed' },
      error: null,
    });

    const result = await deleteAccount();

    expect(result).toEqual({
      ok: false,
      message:
        'Your data was deleted, but we could not end the session on this device. Sign out, and contact support if you can still sign in.',
    });
  });
});
