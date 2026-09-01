import { describe, expect, it } from 'vitest';

import { lensLeft, lensRestLeft, scrubIndex, scrubPosition, type ScrubGeometry } from './dock-scrub';

// the real dock: 8pt of padding, three 80pt slots
const geo: ScrubGeometry = { padH: 8, slot: 80, count: 3 };
/** the centre of slot n, measured from the bar's left edge */
const centre = (n: number) => geo.padH + n * geo.slot + geo.slot / 2;

describe('dock scrub', () => {
  it('reads 0, 1, 2 at the centre of each mark', () => {
    expect(scrubPosition(centre(0), geo)).toBe(0);
    expect(scrubPosition(centre(1), geo)).toBe(1);
    expect(scrubPosition(centre(2), geo)).toBe(2);
  });

  it('reads a fraction between them, so pages follow the thumb', () => {
    // the whole point of dragging: halfway between two marks is halfway
    // between two pages, not a jump to one of them.
    const between = (centre(0) + centre(1)) / 2;
    expect(scrubPosition(between, geo)).toBeCloseTo(0.5, 5);
  });

  it('never runs past either end, however far the thumb goes', () => {
    expect(scrubPosition(-500, geo)).toBe(0);
    expect(scrubPosition(9999, geo)).toBe(geo.count - 1);
    // and a thumb dragged off the left edge does not wrap to the right
    expect(scrubPosition(0, geo)).toBe(0);
  });

  it('lands on the nearest mark when the thumb lifts', () => {
    expect(scrubIndex(centre(1), geo)).toBe(1);
    // just past halfway commits to the next one
    expect(scrubIndex(centre(0) + geo.slot * 0.51, geo)).toBe(1);
    // just short of it does not
    expect(scrubIndex(centre(0) + geo.slot * 0.49, geo)).toBe(0);
  });

  it('keeps the lens under the thumb, not ahead of it', () => {
    // tracking the thumb rather than the nearest slot is what makes the
    // drag feel attached. Snapping the lens would let it arrive before
    // the finger does.
    const x = centre(0) + 20;
    expect(lensLeft(x, geo)).toBe(x - geo.slot / 2);
  });

  it('never lets the lens overhang the bar', () => {
    // a lens sliding out past the last slot would sit over the glass
    // edge with nothing under it.
    expect(lensLeft(-999, geo)).toBe(geo.padH);
    expect(lensLeft(9999, geo)).toBe(geo.padH + (geo.count - 1) * geo.slot);
  });

  it('rests exactly on the selected slot', () => {
    for (let i = 0; i < geo.count; i += 1) {
      expect(lensRestLeft(i, geo)).toBe(geo.padH + i * geo.slot);
      // and resting where a thumb at that slot's centre would put it
      expect(lensRestLeft(i, geo)).toBe(lensLeft(centre(i), geo));
    }
  });

  it('clamps a nonsense index rather than positioning off the bar', () => {
    expect(lensRestLeft(-3, geo)).toBe(geo.padH);
    expect(lensRestLeft(99, geo)).toBe(geo.padH + (geo.count - 1) * geo.slot);
  });
});
