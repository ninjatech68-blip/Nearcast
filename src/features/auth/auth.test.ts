import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Magic-link auth has two modes the screen can't tell apart: the local
 * path that keeps the fixture build usable, and the remote path with a
 * mocked client. These cover sending the link and completing it from
 * the callback URL — the two halves of the passwordless flow.
 */

const mockGetSupabase = vi.fn();
const mockSetSignedIn = vi.fn();
const mockClearLocal = vi.fn();

vi.mock('@/infrastructure/supabase/client', () => ({
  getSupabase: () => mockGetSupabase(),
  isBackendConfigured: () => mockGetSupabase() !== null,
}));

vi.mock('@/features/me/me-store', () => ({
  setSignedIn: (v: string) => mockSetSignedIn(v),
  signOut: () => mockClearLocal(),
}));

// expo-linking: createURL builds the app deep link; parse splits query params.
vi.mock('expo-linking', () => ({
  createURL: (path: string) => `nearcast://${path}`,
  parse: (url: string) => {
    const q: Record<string, string> = {};
    const qi = url.indexOf('?');
    if (qi >= 0) {
      for (const pair of url.slice(qi + 1).split('#')[0].split('&')) {
        const [k, v] = pair.split('=');
        if (k) q[k] = decodeURIComponent(v ?? '');
      }
    }
    return { queryParams: q };
  },
}));

const {
  sendMagicLink,
  completeAuthFromUrl,
  isAuthCallbackUrl,
  authRedirectUrl,
  restoreSession,
  signOut,
  requiresLink,
} = await import('./auth');

function clientWith(auth: Record<string, unknown>) {
  return { auth };
}

beforeEach(() => {
  mockGetSupabase.mockReset();
  mockSetSignedIn.mockReset();
  mockClearLocal.mockReset();
});

describe('auth — no backend configured', () => {
  beforeEach(() => mockGetSupabase.mockReturnValue(null));

  it('signs in immediately and reports that no link was sent', async () => {
    const result = await sendMagicLink(' piyush@example.com ');
    expect(result).toEqual({ ok: true, sent: false });
    expect(mockSetSignedIn).toHaveBeenCalledWith('piyush@example.com');
  });

  it('says no link is part of the flow', () => {
    expect(requiresLink()).toBe(false);
  });

  it('treats a callback as a no-op success in local mode', async () => {
    expect(await completeAuthFromUrl('nearcast://auth/callback?code=x')).toEqual({ ok: true });
  });

  it('still wipes local state on sign out', async () => {
    await signOut();
    expect(mockClearLocal).toHaveBeenCalled();
  });
});

describe('auth — backend configured', () => {
  it('sends a magic link with the app deep link as the redirect', async () => {
    const signInWithOtp = vi.fn(async () => ({ error: null }));
    mockGetSupabase.mockReturnValue(clientWith({ signInWithOtp }));

    const result = await sendMagicLink('a@b.com');
    expect(result).toEqual({ ok: true, sent: true });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.com',
      options: { emailRedirectTo: authRedirectUrl(), shouldCreateUser: true },
    });
    // sending is not signing in — that only happens on the callback
    expect(mockSetSignedIn).not.toHaveBeenCalled();
  });

  it('log in mode does not create an account (shouldCreateUser: false)', async () => {
    const signInWithOtp = vi.fn(async () => ({ error: null }));
    mockGetSupabase.mockReturnValue(clientWith({ signInWithOtp }));

    await sendMagicLink('a@b.com', { createUser: false });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.com',
      options: { emailRedirectTo: authRedirectUrl(), shouldCreateUser: false },
    });
  });

  it('tells a log-in with no account to sign up instead', async () => {
    mockGetSupabase.mockReturnValue(
      clientWith({ signInWithOtp: vi.fn(async () => ({ error: new Error('Signups not allowed for otp') })) }),
    );
    const result = await sendMagicLink('new@b.com', { createUser: false });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toMatch(/sign up/);
  });

  it('turns a rate-limit error into something a person can act on', async () => {
    mockGetSupabase.mockReturnValue(
      clientWith({ signInWithOtp: vi.fn(async () => ({ error: new Error('Email rate limit exceeded') })) }),
    );
    const result = await sendMagicLink('a@b.com');
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toMatch(/too many tries/);
  });

  it('exchanges the code for a session and signs in', async () => {
    const exchangeCodeForSession = vi.fn(async () => ({
      data: { session: { user: { email: 'a@b.com' } } },
      error: null,
    }));
    mockGetSupabase.mockReturnValue(clientWith({ exchangeCodeForSession }));

    const result = await completeAuthFromUrl('nearcast://auth/callback?code=abc123');
    expect(result).toEqual({ ok: true });
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(mockSetSignedIn).toHaveBeenCalledWith('a@b.com');
  });

  it('explains an expired link rather than echoing the raw error', async () => {
    mockGetSupabase.mockReturnValue(
      clientWith({ exchangeCodeForSession: vi.fn(async () => ({ data: { session: null }, error: new Error('Token has expired or is invalid') })) }),
    );
    const result = await completeAuthFromUrl('nearcast://auth/callback?code=stale');
    expect(result.ok === false && result.message).toMatch(/expired|no longer valid/);
    expect(mockSetSignedIn).not.toHaveBeenCalled();
  });

  it('surfaces an error the link itself carried, without calling exchange', async () => {
    const exchangeCodeForSession = vi.fn();
    mockGetSupabase.mockReturnValue(clientWith({ exchangeCodeForSession }));
    const result = await completeAuthFromUrl(
      'nearcast://auth/callback?error=access_denied&error_description=Email+link+is+invalid+or+has+expired',
    );
    expect(result.ok).toBe(false);
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('does NOT sign in when the exchange returns no session', async () => {
    mockGetSupabase.mockReturnValue(
      clientWith({ exchangeCodeForSession: vi.fn(async () => ({ data: { session: null }, error: null })) }),
    );
    const result = await completeAuthFromUrl('nearcast://auth/callback?code=abc');
    expect(result.ok).toBe(false);
    expect(mockSetSignedIn).not.toHaveBeenCalled();
  });

  it('restores a session and prefers email, then phone, then id', async () => {
    mockGetSupabase.mockReturnValue(
      clientWith({ getSession: vi.fn(async () => ({ data: { session: { user: { phone: '+9199', id: 'uid' } } } })) }),
    );
    expect(await restoreSession()).toBe('+9199');
    expect(mockSetSignedIn).toHaveBeenCalledWith('+9199');
  });

  it('wipes local state even when the remote sign-out throws', async () => {
    mockGetSupabase.mockReturnValue(
      clientWith({ signOut: vi.fn(async () => { throw new Error('offline'); }) }),
    );
    await signOut();
    expect(mockClearLocal).toHaveBeenCalled();
  });
});

describe('isAuthCallbackUrl', () => {
  it('matches our callback path and any code/error carrier', () => {
    expect(isAuthCallbackUrl('nearcast://auth/callback?code=x')).toBe(true);
    expect(isAuthCallbackUrl('https://nearcast.app/auth/callback?code=x')).toBe(true);
    expect(isAuthCallbackUrl('nearcast://cast/123')).toBe(false);
    expect(isAuthCallbackUrl('')).toBe(false);
  });
});
