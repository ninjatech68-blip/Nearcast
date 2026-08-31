import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Redemption is the only path that creates a member, so these cover the
 * pure copy rules and the one remote call, with a mocked client.
 */

const mockGetSupabase = vi.fn();

vi.mock('@/infrastructure/supabase/client', () => ({
  getSupabase: () => mockGetSupabase(),
}));

const { describeInviteOutcome, normaliseInviteToken, redeemInvite } = await import('./invite');

function clientReturning(row: unknown, error: unknown = null) {
  return { rpc: vi.fn(async () => ({ data: row === null ? null : [row], error })) };
}

describe('normaliseInviteToken', () => {
  it('takes a token out of whatever it was pasted from', () => {
    expect(normaliseInviteToken('  ABCdef123  ')).toBe('abcdef123');
  });

  it('drops the spaces a chat app inserts', () => {
    expect(normaliseInviteToken('abc def\n123')).toBe('abcdef123');
  });
});

describe('describeInviteOutcome', () => {
  /**
   * One message for missing, expired and already-redeemed, matching the
   * single outcome the database returns: a caller must not be able to
   * probe which invitations exist.
   */
  it('says nothing about why an invitation did not work', () => {
    const message = describeInviteOutcome('invalid_invite');

    expect(message).toBe(
      'That invitation cannot be used. It may already have been used, or it may have expired.',
    );
    // The property that matters is that neither cause is asserted: both are
    // offered as possibilities, so the message fits all three server cases
    // and confirms none of them.
    expect(message).toMatch(/may already have been used/);
    expect(message).toMatch(/may have expired/);
  });

  it('tells someone rate-limited when to come back', () => {
    expect(describeInviteOutcome('rate_limited')).toMatch(/an hour/);
  });

  it('points at the name when the name is the problem', () => {
    expect(describeInviteOutcome('invalid_input')).toMatch(/name/i);
  });

  it('has no message for success, because there is nothing to say', () => {
    expect(describeInviteOutcome('redeemed')).toBeNull();
  });
});

describe('redeemInvite', () => {
  beforeEach(() => {
    mockGetSupabase.mockReset();
  });

  it('reports the outcome the database returned', async () => {
    mockGetSupabase.mockReturnValue(
      clientReturning({ outcome: 'redeemed', member_id: 'm1', member_display_name: 'Ravi' }),
    );

    await expect(redeemInvite('token', 'Ravi')).resolves.toBe('redeemed');
  });

  it('passes the trimmed token and name to the server', async () => {
    const client = clientReturning({ outcome: 'redeemed', member_id: 'm1', member_display_name: 'Ravi' });
    mockGetSupabase.mockReturnValue(client);

    await redeemInvite('  AB cd  ', '  Ravi Nair  ');

    expect(client.rpc).toHaveBeenCalledWith('redeem_invite', {
      invite_token: 'abcd',
      chosen_display_name: 'Ravi Nair',
    });
  });

  it('reads a failed call as failed, never as redeemed', async () => {
    mockGetSupabase.mockReturnValue(clientReturning(null, { message: 'network' }));

    await expect(redeemInvite('token', 'Ravi')).resolves.toBe('failed');
  });

  it('reads an empty result as failed rather than assuming membership', async () => {
    mockGetSupabase.mockReturnValue({ rpc: vi.fn(async () => ({ data: [], error: null })) });

    await expect(redeemInvite('token', 'Ravi')).resolves.toBe('failed');
  });

  /**
   * The fixture build has no server to ask. Answering "redeemed" would
   * hand out membership the database never granted.
   */
  it('reports no backend rather than granting membership locally', async () => {
    mockGetSupabase.mockReturnValue(null);

    await expect(redeemInvite('token', 'Ravi')).resolves.toBe('no_backend');
  });
});
