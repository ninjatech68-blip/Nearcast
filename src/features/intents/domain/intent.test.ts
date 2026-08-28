import { describe, expect, it } from 'vitest';

import {
  CAST_CATEGORIES,
  INTENT_RADIUS_KM_MAX,
  INTENT_RADIUS_KM_MIN,
  intentDraftSchema,
} from './intent';

describe('intent draft', () => {
  it('accepts a categorized cast with an explicit future expiry', () => {
    const result = intentDraftSchema.safeParse({
      category: 'help',
      statement: 'two volunteers to help move books this evening.',
      expiresAt: '2026-08-25T18:00:00.000Z',
      radiusKm: 5,
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty statements and anything past one breath (140)', () => {
    expect(
      intentDraftSchema.safeParse({
        category: 'help',
        statement: '   ',
        expiresAt: '2026-08-25T18:00:00.000Z',
        radiusKm: 5,
      }).success,
    ).toBe(false);
    expect(
      intentDraftSchema.safeParse({
        category: 'help',
        statement: 'a'.repeat(141),
        expiresAt: '2026-08-25T18:00:00.000Z',
        radiusKm: 5,
      }).success,
    ).toBe(false);
  });

  it('rejects a cast with no category or an unknown one', () => {
    expect(
      intentDraftSchema.safeParse({
        statement: 'badminton after work. need two.',
        expiresAt: '2026-08-25T18:00:00.000Z',
        radiusKm: 5,
      }).success,
    ).toBe(false);
    expect(
      intentDraftSchema.safeParse({
        category: 'crypto',
        statement: 'badminton after work. need two.',
        expiresAt: '2026-08-25T18:00:00.000Z',
        radiusKm: 5,
      }).success,
    ).toBe(false);
  });

  it('rejects a radius the database would refuse, and one that was never chosen', () => {
    const draft = {
      category: 'help' as const,
      statement: 'two volunteers to help move books this evening.',
      expiresAt: '2026-08-25T18:00:00.000Z',
    };
    expect(intentDraftSchema.safeParse({ ...draft, radiusKm: INTENT_RADIUS_KM_MIN - 1 }).success).toBe(false);
    expect(intentDraftSchema.safeParse({ ...draft, radiusKm: INTENT_RADIUS_KM_MAX + 1 }).success).toBe(false);
    expect(intentDraftSchema.safeParse({ ...draft, radiusKm: 2.5 }).success).toBe(false);
    // a cast always travels some distance — there is no unset state
    expect(intentDraftSchema.safeParse(draft).success).toBe(false);
  });

  it('exposes exactly ten categories', () => {
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
  });
});
