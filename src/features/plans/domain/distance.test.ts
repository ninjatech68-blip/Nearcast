import { describe, expect, it } from 'vitest';

import { planDistance } from './distance';

describe('plan distance (06 §9.6)', () => {
  it('never shows anything more precise than "under 1"', () => {
    expect(planDistance(0, 'km')).toBe('under 1 km');
    expect(planDistance(999, 'km')).toBe('under 1 km');
  });

  it('rounds to whole units with "≈"', () => {
    expect(planDistance(1000, 'km')).toBe('≈ 1 km');
    expect(planDistance(2600, 'km')).toBe('≈ 3 km');
    expect(planDistance(12_400, 'km')).toBe('≈ 12 km');
  });

  it('supports miles', () => {
    expect(planDistance(1000, 'mi')).toBe('under 1 mi');
    expect(planDistance(4828, 'mi')).toBe('≈ 3 mi');
  });

  it('rejects negative or non-finite input', () => {
    expect(() => planDistance(-1, 'km')).toThrow();
    expect(() => planDistance(Number.NaN, 'km')).toThrow();
  });
});
