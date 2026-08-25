import { describe, expect, it } from 'vitest';

import { assertTrustContext } from './trust';

describe('trust context', () => {
  it.each([
    'One trusted connection from your network',
    '8 of 9 confirmed interactions were completed',
    'Confirmed by 3 people at the origin',
    'Phone verified. Verification does not guarantee safety.',
    'No completed interactions yet',
  ])('accepts the factual line %s', (line) => {
    expect(assertTrustContext(line)).toBe(line);
  });

  it('rejects the banned universal-score shape', () => {
    expect(() => assertTrustContext('Trust 812 · High trust')).toThrow(/score/i);
    expect(() => assertTrustContext('Trust: 640')).toThrow(/score/i);
  });

  it.each(['92%', '4.7 stars', '1.2k followers', '340 likes', '812'])(
    'rejects the popularity-shaped value %s',
    (line) => {
      expect(() => assertTrustContext(line)).toThrow(/rating|percentage|popularity/i);
    },
  );

  it('rejects guarantee language', () => {
    expect(() => assertTrustContext('100% safe to meet')).toThrow(/guarantee/i);
    expect(() => assertTrustContext('Trusted user')).toThrow(/guarantee/i);
  });

  it('requires a human-readable line', () => {
    expect(() => assertTrustContext('   ')).toThrow(/human-readable/i);
  });
});
