import { describe, expect, it } from 'vitest';

import { CAST_CATEGORIES, INTENT_REACH_LEVELS, intentDraftSchema } from './intent';

describe('intent draft', () => {
  it('accepts a categorized cast with an explicit future expiry', () => {
    const result = intentDraftSchema.safeParse({
      category: 'help',
      statement: 'two volunteers to help move books this evening.',
      expiresAt: '2026-08-25T18:00:00.000Z',
      reach: 'origin_only',
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty statements and anything past one breath (140)', () => {
    expect(
      intentDraftSchema.safeParse({
        category: 'help',
        statement: '   ',
        expiresAt: '2026-08-25T18:00:00.000Z',
        reach: 'origin_only',
      }).success,
    ).toBe(false);
    expect(
      intentDraftSchema.safeParse({
        category: 'help',
        statement: 'a'.repeat(141),
        expiresAt: '2026-08-25T18:00:00.000Z',
        reach: 'origin_only',
      }).success,
    ).toBe(false);
  });

  it('rejects a cast with no category or an unknown one', () => {
    expect(
      intentDraftSchema.safeParse({
        statement: 'badminton after work. need two.',
        expiresAt: '2026-08-25T18:00:00.000Z',
        reach: 'origin_only',
      }).success,
    ).toBe(false);
    expect(
      intentDraftSchema.safeParse({
        category: 'crypto',
        statement: 'badminton after work. need two.',
        expiresAt: '2026-08-25T18:00:00.000Z',
        reach: 'origin_only',
      }).success,
    ).toBe(false);
  });

  it('exposes exactly ten categories and four ordered reach levels', () => {
    expect(CAST_CATEGORIES).toHaveLength(10);
    expect(CAST_CATEGORIES).toEqual([
      'social',
      'sports',
      'food',
      'music',
      'travel',
      'games',
      'arts',
      'learning',
      'networking',
      'help',
    ]);
    expect(INTENT_REACH_LEVELS).toEqual([
      'origin_only',
      'adjacent_network',
      'nearby_relevant',
      'broader_approved',
    ]);
  });
});
