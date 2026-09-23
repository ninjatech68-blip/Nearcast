import { describe, expect, it } from 'vitest';

import { buildAppConfig } from '../app.config';

describe('app config', () => {
  it('uses the TrueGoing store identity for production', () => {
    const config = buildAppConfig('production');

    expect(config.name).toBe('TrueGoing');
    expect(config.slug).toBe('truegoing');
    expect(config.scheme).toBe('truegoing');
    expect(config.ios?.bundleIdentifier).toBe('com.truegoing.app');
    expect(config.android?.package).toBe('com.truegoing.app');
  });

  it('uses the store identity for internal preview builds', () => {
    const config = buildAppConfig('preview');

    expect(config.ios?.bundleIdentifier).toBe('com.truegoing.app');
    expect(config.android?.package).toBe('com.truegoing.app');
    expect(config.scheme).toBe('truegoing');
  });

  it('uses a separate identity for development builds so both fit on one phone', () => {
    const config = buildAppConfig('development');

    expect(config.name).toBe('TrueGoing Dev');
    expect(config.scheme).toBe('truegoing-dev');
    expect(config.ios?.bundleIdentifier).toBe('com.truegoing.app.dev');
    expect(config.android?.package).toBe('com.truegoing.app.dev');
  });

  it('keeps the slug stable across variants', () => {
    expect(buildAppConfig('development').slug).toBe('truegoing');
    expect(buildAppConfig('preview').slug).toBe('truegoing');
  });

  it('follows the system appearance', () => {
    expect(buildAppConfig('production').userInterfaceStyle).toBe('automatic');
  });

  it('never ships the old Nearcast identity', () => {
    const serialized = JSON.stringify(buildAppConfig('production')).toLowerCase();

    expect(serialized).not.toContain('nearcast');
    expect(serialized).not.toContain('piyushsharma');
  });

  it('rejects an unknown variant instead of guessing', () => {
    expect(() => buildAppConfig('staging' as never)).toThrow('Unknown APP_VARIANT');
  });
});
