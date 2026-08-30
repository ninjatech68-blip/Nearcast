import { describe, expect, it } from 'vitest';

import {
  DISTANCE_BANDS,
  describeDistanceBand,
  isPlaced,
  parseDistanceBand,
} from './distance-band';

describe('distance bands', () => {
  it('has a label for every band the database can return', () => {
    for (const band of DISTANCE_BANDS) {
      expect(describeDistanceBand(band).length).toBeGreaterThan(0);
    }
  });

  it('never renders a number, which would be a coordinate in disguise', () => {
    for (const band of DISTANCE_BANDS) {
      expect(describeDistanceBand(band)).not.toMatch(/\d/);
      expect(describeDistanceBand(band)).not.toMatch(/km|metre|meter|mile/i);
    }
  });

  it('treats an unplaced intent as unknown rather than implying it is close', () => {
    expect(isPlaced('unknown')).toBe(false);
    expect(describeDistanceBand('unknown')).toBe('Distance unknown');
    expect(isPlaced('walking_distance')).toBe(true);
  });

  it('falls back to unknown for a value it does not recognise', () => {
    expect(parseDistanceBand('walking_distance')).toBe('walking_distance');
    expect(parseDistanceBand('1200m')).toBe('unknown');
    expect(parseDistanceBand('')).toBe('unknown');
  });
});
