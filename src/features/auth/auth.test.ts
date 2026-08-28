import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The auth module has two modes and the screens must not be able to
 * tell them apart. These cover both: the local path that keeps the
 * fixture build usable, and the remote path with a mocked client.
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

const { sendCode, verifyCode, restoreSession, signOut, requiresCode } = await import('./auth');

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

  it('signs in immediately and reports that no code is needed', async () => {
    const result = await sendCode('email', ' piyush@example.com ');
    expect(result).toEqual({ ok: true, needsCode: false });
    // trimmed before it is stored
    expect(mockSetSignedIn).toHaveBeenCalledWith('piyush@example.com');
  });

  it('says a code is not part of the flow', () => {
    expect(requiresCode()).toBe(false);
  });

  it('restores nothing — the local store is already the truth', async () => {
    expect(await restoreSession()).toBeNull();
  });

  it('still wipes local state on sign out', async () => {
    await signOut();
    expect(mockClearLocal).toHaveBeenCalled();
  });
});

describe('auth — backend configured', () => {
  it('sends a code and reports that one is needed', async () => {
    const signInWithOtp = vi.fn(async () => ({ error: null }));
    mockGetSupabase.mockReturnValue(clientWith({ signInWithOtp }));

    const result = await sendCode('phone', '+91 98765 43210');
    expect(result).toEqual({ ok: true, needsCode: true });
    expect(signInWithOtp).toHaveBeenCalledWith({ phone: '+91 98765 43210' });
    // sending is not signing in — that only happens on verify
    expect(mockSetSignedIn).not.toHaveBeenCalled();
  });

  it('turns a rate-limit error into something a person can act on', async () => {
    mockGetSupabase.mockReturnValue(
      clientWith({ signInWithOtp: vi.fn(async () => ({ error: new Error('Email rate limit exceeded') })) }),
    );
    const result = await sendCode('email', 'a@b.com');
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toMatch(/too many tries/);
  });

  it('signs in only when verification returns a session', async () => {
    mockGetSupabase.mockReturnValue(
      clientWith({ verifyOtp: vi.fn(async () => ({ data: { session: { user: {} } }, error: null })) }),
    );
    const result = await verifyCode('email', 'a@b.com', '123456');
    expect(result).toEqual({ ok: true });
    expect(mockSetSignedIn).toHaveBeenCalledWith('a@b.com');
  });

  it('does NOT sign in when verification returns no session', async () => {
    // a success-shaped response with no session must not open the app
    mockGetSupabase.mockReturnValue(
      clientWith({ verifyOtp: vi.fn(async () => ({ data: { session: null }, error: null })) }),
    );
    const result = await verifyCode('email', 'a@b.com', '123456');
    expect(result.ok).toBe(false);
    expect(mockSetSignedIn).not.toHaveBeenCalled();
  });

  it('explains an expired code rather than echoing the raw error', async () => {
    mockGetSupabase.mockReturnValue(
      clientWith({ verifyOtp: vi.fn(async () => ({ data: { session: null }, error: new Error('Token has expired') })) }),
    );
    const result = await verifyCode('phone', '+911', '000000');
    expect(result.ok === false && result.message).toMatch(/expired/);
  });

  it('restores a session and prefers email, then phone, then id', async () => {
    mockGetSupabase.mockReturnValue(
      clientWith({ getSession: vi.fn(async () => ({ data: { session: { user: { phone: '+9199', id: 'uid' } } } })) }),
    );
    expect(await restoreSession()).toBe('+9199');
    expect(mockSetSignedIn).toHaveBeenCalledWith('+9199');
  });

  it('wipes local state even when the remote sign-out throws', async () => {
    // a device that could not reach the server must still not be left
    // holding the last person's data
    mockGetSupabase.mockReturnValue(
      clientWith({ signOut: vi.fn(async () => { throw new Error('offline'); }) }),
    );
    await signOut();
    expect(mockClearLocal).toHaveBeenCalled();
  });
});
