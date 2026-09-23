import { describe, expect, it } from 'vitest';

import { relativePlanTime } from './relativeTime';

const tz = 'Asia/Kolkata';
const now = new Date('2026-09-23T10:00:00+05:30'); // Wednesday
const at = (iso: string) => new Date(iso);
const fmt = (startsAt: string, endsAt?: string) =>
  relativePlanTime({
    startsAt: at(startsAt),
    endsAt: at(endsAt ?? '2026-12-31T00:00:00+05:30'),
    now,
    timeZone: tz,
  });

describe('relative plan time (06 §9.6)', () => {
  it('says "now" once started and not yet ended', () => {
    expect(fmt('2026-09-23T09:30:00+05:30', '2026-09-23T11:00:00+05:30')).toBe('now');
  });

  it('says "ended" after the end', () => {
    expect(fmt('2026-09-23T07:00:00+05:30', '2026-09-23T09:00:00+05:30')).toBe('ended');
  });

  it('counts minutes within the hour', () => {
    expect(fmt('2026-09-23T10:20:00+05:30')).toBe('in 20 min');
    expect(fmt('2026-09-23T10:00:30+05:30')).toBe('in 1 min');
    expect(fmt('2026-09-23T10:59:00+05:30')).toBe('in 59 min');
  });

  it('says "tonight" for today from 5 pm, "today" before that', () => {
    expect(fmt('2026-09-23T20:00:00+05:30')).toBe('tonight 8 pm');
    expect(fmt('2026-09-23T17:00:00+05:30')).toBe('tonight 5 pm');
    expect(fmt('2026-09-23T13:30:00+05:30')).toBe('today 1:30 pm');
  });

  it('says "tomorrow" with the time', () => {
    expect(fmt('2026-09-24T07:30:00+05:30')).toBe('tomorrow 7:30 am');
    expect(fmt('2026-09-24T00:15:00+05:30')).toBe('tomorrow 12:15 am');
  });

  it('uses the weekday within a week', () => {
    expect(fmt('2026-09-26T18:00:00+05:30')).toBe('Sat 6 pm');
    expect(fmt('2026-09-29T12:00:00+05:30')).toBe('Tue 12 pm');
  });

  it('uses the date beyond a week', () => {
    expect(fmt('2026-09-30T18:00:00+05:30')).toBe('30 Sep');
    expect(fmt('2026-10-12T09:00:00+05:30')).toBe('12 Oct');
  });

  it('compares calendar days in the given time zone, not UTC', () => {
    // 23:30 IST on the 23rd is 18:00 UTC; tomorrow in IST starts 30 minutes later.
    const lateNow = new Date('2026-09-23T23:30:00+05:30');
    expect(
      relativePlanTime({
        startsAt: at('2026-09-24T01:00:00+05:30'),
        endsAt: at('2026-09-24T03:00:00+05:30'),
        now: lateNow,
        timeZone: tz,
      }),
    ).toBe('tomorrow 1 am');
  });
});
