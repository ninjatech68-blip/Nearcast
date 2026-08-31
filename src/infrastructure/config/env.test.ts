import { describe, expect, it } from 'vitest';

import {
  classifyPublicEnv,
  isLocalNetworkUrl,
  parsePublicEnv,
  releaseBlock,
} from './env';

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

describe('classifyPublicEnv', () => {
  const good = {
    EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'key',
    EXPO_PUBLIC_APP_ENV: 'staging',
  };

  it('reads a well-formed config as configured', () => {
    const result = classifyPublicEnv(good);

    expect(result.kind).toBe('configured');
  });

  it('reads nothing supplied as absent, which is the fixture build', () => {
    expect(classifyPublicEnv({}).kind).toBe('absent');
    expect(
      classifyPublicEnv({
        EXPO_PUBLIC_SUPABASE_URL: '',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '   ',
        EXPO_PUBLIC_APP_ENV: 'local',
      }).kind,
    ).toBe('absent');
  });

  /**
   * The bug this function exists to fix. A typo in APP_ENV used to throw
   * from the parser, and the caller read every throw as "no backend", so
   * the app served fabricated fixtures with a perfectly good URL beside it.
   */
  it('reads a misspelled app env as invalid, never as absent', () => {
    const result = classifyPublicEnv({ ...good, EXPO_PUBLIC_APP_ENV: 'stagng' });

    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') return;
    expect(result.problems.join(' ')).toContain('EXPO_PUBLIC_APP_ENV');
  });

  it('reads a malformed URL as invalid', () => {
    const result = classifyPublicEnv({ ...good, EXPO_PUBLIC_SUPABASE_URL: 'abc.supabase.co' });

    expect(result.kind).toBe('invalid');
  });

  it('reads a half-filled config as invalid rather than absent', () => {
    const result = classifyPublicEnv({
      EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
      EXPO_PUBLIC_APP_ENV: 'staging',
    });

    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') return;
    expect(result.problems.join(' ')).toContain('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  });

  it('names every problem at once, so one rebuild fixes them all', () => {
    const result = classifyPublicEnv({
      EXPO_PUBLIC_SUPABASE_URL: 'nope',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'key',
      EXPO_PUBLIC_APP_ENV: 'nope',
    });

    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') return;
    expect(result.problems).toHaveLength(2);
  });
});

describe('releaseBlock', () => {
  it('lets a live backend through', () => {
    expect(
      releaseBlock({ isRelease: true, mode: 'live', reason: 'connected' }),
    ).toBeNull();
  });

  /**
   * The product rule is that a person is never shown activity that did not
   * happen. A release build on fixtures shows exactly that, and a tester
   * cannot tell. So it is blocked rather than logged.
   */
  it('blocks a release build that has no backend', () => {
    const block = releaseBlock({ isRelease: true, mode: 'fixtures', reason: 'no config' });

    expect(block).not.toBeNull();
    expect(block?.title).toBe('This build has no backend');
  });

  it('blocks a release build whose config is wrong, and says what is wrong', () => {
    const block = releaseBlock({
      isRelease: true,
      mode: 'misconfigured',
      reason: 'EXPO_PUBLIC_APP_ENV must be one of local, staging, production',
    });

    expect(block?.title).toBe('This build is misconfigured');
    expect(block?.detail).toContain('EXPO_PUBLIC_APP_ENV');
  });

  it('leaves a development build alone, because fixtures are how tests run', () => {
    expect(
      releaseBlock({ isRelease: false, mode: 'fixtures', reason: 'no config' }),
    ).toBeNull();
  });

  it('still blocks a misconfigured development build, which is never intentional', () => {
    expect(
      releaseBlock({ isRelease: false, mode: 'misconfigured', reason: 'bad url' }),
    ).not.toBeNull();
  });
});
