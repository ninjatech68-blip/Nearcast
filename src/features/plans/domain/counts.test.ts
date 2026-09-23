import { describe, expect, it } from 'vitest';

import { aggregatePeople, estimateLabel, goingLabel, spotsLabel } from './counts';

describe('counts (06 §9.2 and §9.6)', () => {
  it('hides small aggregate counts of people', () => {
    expect(aggregatePeople(0)).toBeNull();
    expect(aggregatePeople(1)).toBe('a few');
    expect(aggregatePeople(4)).toBe('a few');
    expect(aggregatePeople(5)).toBe('5');
    expect(aggregatePeople(38)).toBe('38');
  });

  it('shows the exact going count, because those people are visible on the card', () => {
    expect(goingLabel(0)).toBeNull();
    expect(goingLabel(1)).toBe('1 going');
    expect(goingLabel(3)).toBe('3 going');
  });

  it('labels server estimates with "≈" and never inflates', () => {
    expect(estimateLabel('few')).toBe('a few');
    expect(estimateLabel(40)).toBe('≈ 40');
    expect(estimateLabel(0)).toBeNull();
  });

  it('describes capacity', () => {
    expect(spotsLabel(null, 3)).toBe('No limit');
    expect(spotsLabel(4, 2)).toBe('2 spots left');
    expect(spotsLabel(4, 3)).toBe('1 spot left');
    expect(spotsLabel(4, 4)).toBe('Full');
    expect(spotsLabel(4, 6)).toBe('Full');
  });

  it('rejects impossible counts', () => {
    expect(() => aggregatePeople(-1)).toThrow();
    expect(() => goingLabel(1.5)).toThrow();
  });
});
