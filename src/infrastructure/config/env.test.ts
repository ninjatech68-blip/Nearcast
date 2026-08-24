import { describe, expect, it } from 'vitest';

import { parsePublicEnv } from './env';

describe('public environment', () => {
  it('accepts a valid Supabase URL, publishable key, and known environment', () => {
    expect(
      parsePublicEnv({
        EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-publishable-key',
        EXPO_PUBLIC_APP_ENV: 'local',
      }),
    ).toEqual({
      supabaseUrl: 'http://127.0.0.1:54321',
      supabasePublishableKey: 'local-publishable-key',
      appEnv: 'local',
    });
  });

  it('rejects missing secrets and unknown environments', () => {
    expect(() =>
      parsePublicEnv({
        EXPO_PUBLIC_SUPABASE_URL: 'not-a-url',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
        EXPO_PUBLIC_APP_ENV: 'production-ish',
      }),
    ).toThrow();
  });
});
