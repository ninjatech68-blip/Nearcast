import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { devSignInAvailable, signInWithDevPassword } from './dev-sign-in';

const signInMock = vi.fn();

vi.mock('@/infrastructure/supabase/client', () => ({
  supabase: { auth: { signInWithPassword: (...args: unknown[]) => signInMock(...args) } },
}));

const originalEnv = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  key: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  app: process.env.EXPO_PUBLIC_APP_ENV,
};

function setEnv(appEnv: string) {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
  process.env.EXPO_PUBLIC_APP_ENV = appEnv;
}

beforeEach(() => {
  signInMock.mockReset();
});

afterEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv.url;
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalEnv.key;
  process.env.EXPO_PUBLIC_APP_ENV = originalEnv.app;
});

describe('devSignInAvailable', () => {
  it('is available in local, so testing without OAuth is possible', () => {
    setEnv('local');
    expect(devSignInAvailable()).toBe(true);
  });

  it('is available in staging, so reviewers can sign in without OAuth credentials', () => {
    setEnv('staging');
    expect(devSignInAvailable()).toBe(true);
  });

  // The non-negotiable rule from AGENTS.md: dev sign-in must never be
  // available in production. This is the second of two locks (the first is
  // never enabling the email provider on the production Supabase project).
  it('is never available in production', () => {
    setEnv('production');
    expect(devSignInAvailable()).toBe(false);
  });

  it('is refused when the environment is unparseable, so a broken config never opens the gate', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'nonsense';
    expect(devSignInAvailable()).toBe(false);
  });
});

describe('signInWithDevPassword', () => {
  it('refuses to call Supabase in production, even when someone reaches the function directly', async () => {
    setEnv('production');

    const result = await signInWithDevPassword('anyone@nearcast.local', 'password');

    expect(result).toEqual({
      ok: false,
      message: 'Development sign-in is not available in production.',
    });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('signs in with the trimmed email against Supabase in local', async () => {
    setEnv('local');
    signInMock.mockResolvedValue({ error: null });

    const result = await signInWithDevPassword('  asha@nearcast.local ', 'password');

    expect(result).toEqual({ ok: true });
    expect(signInMock).toHaveBeenCalledWith({
      email: 'asha@nearcast.local',
      password: 'password',
    });
  });

  it('reports a friendly seed-check message when Supabase rejects the credentials', async () => {
    setEnv('local');
    signInMock.mockResolvedValue({ error: { message: 'Invalid login credentials' } });

    const result = await signInWithDevPassword('asha@nearcast.local', 'wrong');

    expect(result).toEqual({
      ok: false,
      message: 'That local persona could not sign in. Check supabase/seed.sql.',
    });
  });
});
