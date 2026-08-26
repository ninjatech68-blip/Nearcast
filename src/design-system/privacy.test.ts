import { describe, expect, it } from 'vitest';

import {
  assertPrivacySafe,
  findPrivacyViolations,
  findsContactDetails,
  findsExactLocation,
} from './privacy';

describe('exact location detection', () => {
  it.each([
    '12.9716, 77.5946',
    'Meet at 221 Baker Street',
    'Flat 4B, Rosewood Residency',
    'House no. 12',
  ])('flags %s', (value) => {
    expect(findsExactLocation(value)).toBe(true);
  });

  it.each([
    'Indiranagar area',
    'Riverside area',
    'Nearby area',
    'Approximate area',
    'Tonight, 8:00 PM · Indiranagar area',
  ])('accepts the approximate area language %s', (value) => {
    expect(findsExactLocation(value)).toBe(false);
  });
});

describe('contact detail detection', () => {
  it.each(['reach me at aarav@example.com', 'call 555 010 2233', 'ping +91 98765 43210'])(
    'flags %s',
    (value) => {
      expect(findsContactDetails(value)).toBe(true);
    },
  );

  it.each([
    'Two people for badminton tonight',
    'Expires in 7 hours',
    'Tonight, 8:00 PM · Indiranagar area',
  ])('accepts the ordinary copy %s', (value) => {
    expect(findsContactDetails(value)).toBe(false);
  });
});

describe('assertPrivacySafe', () => {
  it('passes privacy-safe copy through silently', () => {
    expect(() => assertPrivacySafe('Area', 'Indiranagar area')).not.toThrow();
  });

  it('names the field and the rule it broke', () => {
    expect(() => assertPrivacySafe('Area', '12.9716, 77.5946')).toThrow(
      'Area must use an approximate area, not an exact location.',
    );
    expect(() => assertPrivacySafe('Summary', 'call 555 010 2233')).toThrow(
      'Summary must not include contact details.',
    );
  });

  it('reports every violation it finds', () => {
    expect(findPrivacyViolations('221 Baker Street, call 555 010 2233')).toEqual([
      'exactLocation',
      'contactDetails',
    ]);
  });
});
