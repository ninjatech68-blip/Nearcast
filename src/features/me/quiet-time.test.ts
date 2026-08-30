import { describe, expect, it } from 'vitest';

import { dateToTime, timeToDate } from './quiet-time';

function at(hours: number, minutes: number): Date {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

describe('quiet hours time labels', () => {
  it('round-trips every label the store can hold', () => {
    for (const label of ['12:00 am', '1:05 am', '11:55 am', '12:30 pm', '10:00 pm', '11:45 pm']) {
      expect(dateToTime(timeToDate(label))).toBe(label);
    }
  });

  it('writes midnight and noon as 12, never as 0', () => {
    expect(dateToTime(at(0, 0))).toBe('12:00 am');
    expect(dateToTime(at(12, 0))).toBe('12:00 pm');
  });

  it('pads minutes so a label never reads 9:5 pm', () => {
    expect(dateToTime(at(21, 5))).toBe('9:05 pm');
  });

  it('falls back to now rather than throwing on a label it cannot read', () => {
    const parsed = timeToDate('whenever');
    expect(parsed).toBeInstanceOf(Date);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });
});
