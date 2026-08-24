import { describe, expect, it } from 'vitest';

import {
  INTENT_PRIMITIVES,
  INTENT_REACH_LEVELS,
  intentDraftSchema,
} from './intent';

describe('intent draft', () => {
  it('accepts a resolvable request with an explicit future expiry', () => {
    const result = intentDraftSchema.safeParse({
      primitive: 'request',
      statement: 'Looking for two volunteers to help move books this evening.',
      expiresAt: '2026-08-25T18:00:00.000Z',
      reach: 'origin_only',
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty or excessively long statements', () => {
    expect(
      intentDraftSchema.safeParse({
        primitive: 'request',
        statement: '   ',
        expiresAt: '2026-08-25T18:00:00.000Z',
        reach: 'origin_only',
      }).success,
    ).toBe(false);
    expect(
      intentDraftSchema.safeParse({
        primitive: 'request',
        statement: 'a'.repeat(501),
        expiresAt: '2026-08-25T18:00:00.000Z',
        reach: 'origin_only',
      }).success,
    ).toBe(false);
  });

  it('exposes only the three product primitives and four ordered reach levels', () => {
    expect(INTENT_PRIMITIVES).toEqual(['request', 'offer', 'plan']);
    expect(INTENT_REACH_LEVELS).toEqual([
      'origin_only',
      'adjacent_network',
      'nearby_relevant',
      'broader_approved',
    ]);
  });
});
