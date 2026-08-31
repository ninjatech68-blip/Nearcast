import { describe, expect, it } from 'vitest';

import { countdownLabel } from './countdown';

const NOW = Date.parse('2026-08-30T12:00:00Z');
const inHours = (h: number) => new Date(NOW + h * 3_600_000).toISOString();
const inMinutes = (m: number) => new Date(NOW + m * 60_000).toISOString();

describe('countdownLabel', () => {
  it('carries no clock for open or ended windows', () => {
    expect(countdownLabel('always', inHours(50), NOW)).toBe('open');
    expect(countdownLabel('ended', inHours(50), NOW)).toBe('ended');
  });

  it('counts days when more than a day remains', () => {
    expect(countdownLabel('week', inHours(50), NOW)).toBe('2d left');
    expect(countdownLabel('week', inHours(168), NOW)).toBe('7d left');
  });

  it('counts hours inside a day', () => {
    expect(countdownLabel('day', inHours(23), NOW)).toBe('23h left');
    expect(countdownLabel('day', inHours(1), NOW)).toBe('1h left');
  });

  it('counts minutes inside the final hour', () => {
    expect(countdownLabel('day', inMinutes(45), NOW)).toBe('45m left');
    expect(countdownLabel('day', inMinutes(1), NOW)).toBe('1m left');
  });

  it('never shows zero: a sliver of time still reads as a minute', () => {
    expect(countdownLabel('day', new Date(NOW + 20_000).toISOString(), NOW)).toBe('1m left');
  });

  it('says expired once the moment has passed', () => {
    expect(countdownLabel('day', inHours(-1), NOW)).toBe('expired');
  });

  it('falls back to 24h when no expiry is set yet', () => {
    expect(countdownLabel('day', null, NOW)).toBe('24h left');
  });
});
