import { describe, expect, it } from 'vitest';

import { isLocalNetworkUrl, parsePublicEnv } from './env';

describe('isLocalNetworkUrl', () => {
  it('flags addresses that only resolve on a home/office network', () => {
    for (const url of [
      'http://127.0.0.1:54321',
      'http://localhost:54321',
      'http://0.0.0.0:54321',
      'http://192.168.1.42:54321',
      'http://10.0.0.5:54321',
      'http://172.16.3.9:54321',
      'http://172.31.0.1:54321',
      'http://mac-mini.local:54321',
    ]) {
      expect(isLocalNetworkUrl(url)).toBe(true);
    }
  });

  it('does not flag a hosted Supabase URL', () => {
    expect(isLocalNetworkUrl('https://abcdefgh.supabase.co')).toBe(false);
    // 172.32+ is public, not RFC-1918
    expect(isLocalNetworkUrl('http://172.32.0.1')).toBe(false);
    expect(isLocalNetworkUrl('not a url')).toBe(false);
  });
});

describe('parsePublicEnv', () => {
  it('accepts a well-formed config', () => {
    const env = parsePublicEnv({
      EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'key',
      EXPO_PUBLIC_APP_ENV: 'production',
    });
    expect(env.supabaseUrl).toBe('https://abc.supabase.co');
  });
});
