import { describe, expect, it } from 'vitest';

import { distanceLabel } from './distance';

describe('distanceLabel', () => {
  it('says nothing rather than inventing a distance', () => {
    expect(distanceLabel(null)).toBeNull();
    expect(distanceLabel(undefined)).toBeNull();
    expect(distanceLabel(Number.NaN)).toBeNull();
    expect(distanceLabel(-5)).toBeNull();
  });

  it('does not put a number on something that is right here', () => {
    expect(distanceLabel(0)).toBe('a few steps away');
    expect(distanceLabel(80)).toBe('a few steps away');
  });

  it('uses metres below a kilometre, in 50 m steps', () => {
    expect(distanceLabel(350)).toBe('350 m away');
    expect(distanceLabel(374)).toBe('350 m away');
    expect(distanceLabel(950)).toBe('950 m away');
  });

  it('uses one decimal of a kilometre up to ten', () => {
    expect(distanceLabel(1100)).toBe('1.1 km away');
    expect(distanceLabel(2449)).toBe('2.4 km away');
    expect(distanceLabel(9950)).toBe('10.0 km away');
  });

  it('drops the decimal past ten kilometres', () => {
    expect(distanceLabel(12400)).toBe('12 km away');
    expect(distanceLabel(48000)).toBe('48 km away');
  });
});
