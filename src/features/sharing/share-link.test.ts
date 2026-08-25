import { describe, expect, it } from 'vitest';

import { buildShareLink } from './share-link';

describe('buildShareLink', () => {
  it('uses the configured HTTPS base when the domain exists', () => {
    expect(buildShareLink('abc-123', 'https://nearcast.app')).toBe(
      'https://nearcast.app/i/abc-123',
    );
  });

  it('tolerates a trailing slash on the configured base', () => {
    expect(buildShareLink('abc-123', 'https://nearcast.app/')).toBe(
      'https://nearcast.app/i/abc-123',
    );
  });

  it('falls back to the app scheme while the domain is pending', () => {
    expect(buildShareLink('abc-123', null)).toBe('nearcast://i/abc-123');
  });
});
