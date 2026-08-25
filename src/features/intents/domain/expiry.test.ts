import { describe, expect, it } from 'vitest';

import { formatExpiry } from './expiry';

const HOUR = 3_600_000;

describe('formatExpiry', () => {
  it('marks a lapsed intent as expired rather than showing negative time', () => {
    expect(formatExpiry(new Date(Date.now() - HOUR).toISOString())).toBe('Expired');
  });

  it('avoids false urgency for a distant expiry', () => {
    expect(formatExpiry(new Date(Date.now() + 50 * HOUR).toISOString())).toBe('Expires in 2 days');
  });

  it('uses singular units where they read naturally', () => {
    expect(formatExpiry(new Date(Date.now() + 1.5 * HOUR).toISOString())).toBe('Expires in 1 hour');
  });

  it('treats an unparseable value as expired rather than rendering NaN', () => {
    expect(formatExpiry('not-a-date')).toBe('Expired');
  });
});
