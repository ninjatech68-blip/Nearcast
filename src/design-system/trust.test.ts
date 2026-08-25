import { describe, expect, it } from 'vitest';

import { formatTrustDisplay } from './trust';

describe('trust display', () => {
  it('renders the standardised trust string from DESIGN.md', () => {
    expect(formatTrustDisplay({ score: 812, band: 'High trust' })).toBe('Trust 812 · High trust');
  });

  it('rejects scores that are not whole, non-negative counts', () => {
    expect(() => formatTrustDisplay({ score: 4.7, band: 'High trust' })).toThrow(/whole/i);
    expect(() => formatTrustDisplay({ score: -1, band: 'High trust' })).toThrow(/whole/i);
  });

  it('rejects popularity-shaped bands so trust never reads as a rating', () => {
    for (const band of ['92%', '4.7 stars', '1.2k followers', '340 likes']) {
      expect(() => formatTrustDisplay({ score: 812, band }), band).toThrow(/band/i);
    }
  });

  it('requires a human-readable band', () => {
    expect(() => formatTrustDisplay({ score: 812, band: '   ' })).toThrow(/band/i);
  });
})
