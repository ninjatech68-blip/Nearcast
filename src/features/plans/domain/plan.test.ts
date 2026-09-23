import { describe, expect, it } from 'vitest';

import { makePlanDraftSchema } from './plan';

const now = new Date('2026-09-23T10:00:00+05:30');
const schema = makePlanDraftSchema(now);

const valid = {
  type: 'plan' as const,
  text: '  Badminton tonight  ',
  emoji: '🏸',
  startsAt: new Date('2026-09-23T20:00:00+05:30'),
  endsAt: new Date('2026-09-23T22:00:00+05:30'),
  capacity: 4,
  areaName: 'Sector 8',
  city: 'Chandigarh',
  exactPoint: { lat: 30.74263, lng: 76.78416 },
};

describe('plan draft', () => {
  it('accepts a valid plan and trims the text', () => {
    const draft = schema.parse(valid);
    expect(draft.text).toBe('Badminton tonight');
    expect(draft.womenOnly).toBe(false);
    expect(draft.verifiedOnly).toBe(false);
    expect(draft.spotVisibility).toBe('on_unlock');
  });

  it('rejects empty or overlong text', () => {
    expect(schema.safeParse({ ...valid, text: '   ' }).success).toBe(false);
    expect(schema.safeParse({ ...valid, text: 'a'.repeat(501) }).success).toBe(false);
    expect(schema.safeParse({ ...valid, text: 'a'.repeat(500) }).success).toBe(true);
  });

  it('counts emoji the way the database does (code points, max 8)', () => {
    expect(schema.safeParse({ ...valid, emoji: '🏋️' }).success).toBe(true);
    expect(schema.safeParse({ ...valid, emoji: '' }).success).toBe(false);
    expect(schema.safeParse({ ...valid, emoji: '🏸🏸🏸🏸🏸🏸🏸🏸🏸' }).success).toBe(false);
  });

  it('requires the end after the start', () => {
    const result = schema.safeParse({ ...valid, endsAt: valid.startsAt });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('invalid_time');
  });

  it('rejects a start more than an hour in the past', () => {
    const startsAt = new Date(now.getTime() - 61 * 60_000);
    const endsAt = new Date(now.getTime() + 60 * 60_000);
    expect(schema.safeParse({ ...valid, startsAt, endsAt }).success).toBe(false);
    const recent = new Date(now.getTime() - 30 * 60_000);
    expect(schema.safeParse({ ...valid, startsAt: recent, endsAt }).success).toBe(true);
  });

  it('allows no limit or 1 to 200 people for plans', () => {
    expect(schema.parse({ ...valid, capacity: null }).capacity).toBeNull();
    expect(schema.safeParse({ ...valid, capacity: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, capacity: 201 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, capacity: 2.5 }).success).toBe(false);
  });

  it('forces asks and offers to one accepted person', () => {
    expect(schema.parse({ ...valid, type: 'ask', capacity: 5 }).capacity).toBe(1);
    expect(schema.parse({ ...valid, type: 'offer', capacity: null }).capacity).toBe(1);
  });

  it('makes women-only imply verified-only', () => {
    expect(schema.parse({ ...valid, womenOnly: true }).verifiedOnly).toBe(true);
  });

  it('rejects coordinates out of range', () => {
    expect(schema.safeParse({ ...valid, exactPoint: { lat: 91, lng: 0 } }).success).toBe(false);
    expect(schema.safeParse({ ...valid, exactPoint: { lat: 0, lng: 181 } }).success).toBe(false);
  });

  it('requires an area and a city', () => {
    expect(schema.safeParse({ ...valid, areaName: ' ' }).success).toBe(false);
    expect(schema.safeParse({ ...valid, city: '' }).success).toBe(false);
  });
});
