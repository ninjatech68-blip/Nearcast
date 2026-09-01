import { describe, expect, it } from 'vitest';

import { dragPosition, lensRestLeft, type ScrubGeometry } from './dock-scrub';

// the real dock: 8pt of padding, three 80pt slots
const geo: ScrubGeometry = { padH: 8, slot: 80, count: 3 };

describe('dock drag', () => {
  it('stays on the page the drag started from until the thumb moves', () => {
    // the whole point of a relative scrub: a touch does not teleport the
    // pager to the finger. Zero travel means zero movement.
    expect(dragPosition(1, 0, geo)).toBe(1);
    expect(dragPosition(2, 0, geo)).toBe(2);
  });

  it('moves in either direction from the start page', () => {
    // this is the bug the relative scrub fixes: from a middle page a drag
    // must go both ways, not snap to whichever end the finger is nearer.
    expect(dragPosition(1, geo.slot / 2, geo)).toBeCloseTo(1.5, 5);
    expect(dragPosition(1, -geo.slot / 2, geo)).toBeCloseTo(0.5, 5);
  });

  it('is one page per slot of travel', () => {
    expect(dragPosition(0, geo.slot, geo)).toBe(1);
    expect(dragPosition(0, 2 * geo.slot, geo)).toBe(2);
  });

  it('never runs past either end, however far the thumb goes', () => {
    expect(dragPosition(2, 9999, geo)).toBe(geo.count - 1);
    expect(dragPosition(0, -9999, geo)).toBe(0);
    // and a drag left off the first page does not wrap to the last
    expect(dragPosition(0, -geo.slot, geo)).toBe(0);
  });

  it('lands on the nearest page when the thumb lifts', () => {
    // release rounds the fractional position.
    expect(Math.round(dragPosition(0, geo.slot * 0.51, geo))).toBe(1);
    expect(Math.round(dragPosition(0, geo.slot * 0.49, geo))).toBe(0);
    expect(Math.round(dragPosition(2, -geo.slot * 0.51, geo))).toBe(1);
  });
});

describe('selection lens', () => {
  it('rests exactly on each slot', () => {
    for (let i = 0; i < geo.count; i += 1) {
      expect(lensRestLeft(i, geo)).toBe(geo.padH + i * geo.slot);
    }
  });

  it('slides between slots for a fractional position, so it can track a swipe', () => {
    // tracking the pager's continuous position rather than snapping at the
    // halfway point is what makes the lens slide with a swipe.
    expect(lensRestLeft(0.5, geo)).toBe(geo.padH + 0.5 * geo.slot);
    expect(lensRestLeft(1.25, geo)).toBe(geo.padH + 1.25 * geo.slot);
  });

  it('never overhangs the bar, however far the position runs', () => {
    // a lens sliding out past the last slot would sit over the glass edge
    // with nothing under it.
    expect(lensRestLeft(-999, geo)).toBe(geo.padH);
    expect(lensRestLeft(9999, geo)).toBe(geo.padH + (geo.count - 1) * geo.slot);
  });
});
