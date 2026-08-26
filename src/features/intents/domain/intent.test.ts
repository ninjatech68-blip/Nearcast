import { describe, expect, it } from 'vitest';

import {
  INTENT_PRIMITIVES,
  INTENT_REACH_LEVELS,
  describeMaterialEdit,
  intentDraftSchema,
  intentEditSchema,
  intentPublishSchema,
  toChangePayload,
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

const publishable = {
  primitive: 'request' as const,
  statement: 'Need a spare projector for a workshop on Saturday.',
  responseAction: 'Offer help',
  expiresAt: '2026-08-30T18:00:00.000Z',
  approximatePlace: 'Indiranagar',
  reach: 'adjacent_network' as const,
  publicLinkEnabled: false,
  showFirstName: true,
  idempotencyKey: 'key-1',
};

describe('publish boundary', () => {
  it('accepts a complete draft', () => {
    expect(intentPublishSchema.safeParse(publishable).success).toBe(true);
  });

  it('accepts an intent with no stated area', () => {
    expect(
      intentPublishSchema.safeParse({ ...publishable, approximatePlace: null }).success,
    ).toBe(true);
  });

  it('rejects a response action longer than the column allows', () => {
    expect(
      intentPublishSchema.safeParse({ ...publishable, responseAction: 'x'.repeat(41) }).success,
    ).toBe(false);
  });

  it('rejects an empty response action, a blank area, and a missing idempotency key', () => {
    expect(
      intentPublishSchema.safeParse({ ...publishable, responseAction: '  ' }).success,
    ).toBe(false);
    expect(
      intentPublishSchema.safeParse({ ...publishable, approximatePlace: '  ' }).success,
    ).toBe(false);
    expect(
      intentPublishSchema.safeParse({ ...publishable, idempotencyKey: '' }).success,
    ).toBe(false);
  });

  it('rejects an expiry that is not a timestamp', () => {
    expect(
      intentPublishSchema.safeParse({ ...publishable, expiresAt: 'saturday' }).success,
    ).toBe(false);
  });
});

describe('owner edits', () => {
  it('accepts a single changed field', () => {
    expect(intentEditSchema.safeParse({ priceMinor: 50000 }).success).toBe(true);
  });

  it('rejects an edit that changes nothing', () => {
    expect(intentEditSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a negative price, a fractional price, and a malformed currency', () => {
    expect(intentEditSchema.safeParse({ priceMinor: -1 }).success).toBe(false);
    expect(intentEditSchema.safeParse({ priceMinor: 10.5 }).success).toBe(false);
    expect(intentEditSchema.safeParse({ currency: 'RUPEE' }).success).toBe(false);
  });

  it('allows clearing an optional field but never the statement', () => {
    expect(intentEditSchema.safeParse({ approximatePlace: null }).success).toBe(true);
    expect(intentEditSchema.safeParse({ statement: null }).success).toBe(false);
  });

  it('rejects requirements that are not a bounded list of short strings', () => {
    expect(intentEditSchema.safeParse({ requirements: 'vegetarian' }).success).toBe(false);
    expect(
      intentEditSchema.safeParse({ requirements: Array(11).fill('a') }).success,
    ).toBe(false);
    expect(intentEditSchema.safeParse({ requirements: ['Vegetarian'] }).success).toBe(true);
  });

  it('maps the validated edit onto the column names the server accepts', () => {
    expect(
      toChangePayload({ priceMinor: 60000, currency: 'INR', approximatePlace: 'Indiranagar' }),
    ).toEqual({
      price_minor: 60000,
      currency: 'INR',
      approximate_place: 'Indiranagar',
    });
  });

  it('carries a cleared field through as an explicit null', () => {
    expect(toChangePayload({ approximatePlace: null })).toEqual({ approximate_place: null });
  });
});

describe('material edit description', () => {
  it('names one changed category', () => {
    expect(describeMaterialEdit(['price'])).toBe('The price changed after you responded.');
  });

  it('reads as a sentence with several categories', () => {
    expect(describeMaterialEdit(['price', 'location', 'time'])).toBe(
      'The price, the area and the timing changed after you responded.',
    );
  });

  it('stays honest when the server names something it does not recognise', () => {
    expect(describeMaterialEdit(['sorcery'])).toBe('This intent changed after you responded.');
    expect(describeMaterialEdit([])).toBe('This intent changed after you responded.');
  });
});
