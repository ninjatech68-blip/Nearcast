/**
 * Where a thumb on the dock is pointing.
 *
 * Kept pure and separate from the component because this is where the
 * bugs live: off-by-half-a-slot errors, a lens that runs past the end of
 * the bar, a release that lands on the wrong page. None of that needs a
 * renderer to catch.
 *
 * The bar is `padH` of padding, then N slots of `slot` width. A touch is
 * measured from the bar's own left edge, not the screen's.
 */

export type ScrubGeometry = {
  /** horizontal padding before the first slot */
  readonly padH: number;
  /** width of one slot */
  readonly slot: number;
  /** how many destinations */
  readonly count: number;
};

/** clamp, because every function here needs it and RN has no Math.clamp. */
function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * The page position a thumb is over, as a FRACTION -- 0.5 means halfway
 * between the first and second.
 *
 * Fractional rather than a whole index because the pages follow the
 * thumb continuously. Rounding here would make them jump a page at a
 * time, which is the thing dragging is supposed to avoid.
 */
export function scrubPosition(x: number, geo: ScrubGeometry): number {
  const withinSlots = x - geo.padH;
  // subtract half a slot so the value is 0 when the thumb is over the
  // CENTRE of the first mark rather than over its left edge.
  return clamp(withinSlots / geo.slot - 0.5, 0, geo.count - 1);
}

/** the destination a release at this position lands on. */
export function scrubIndex(x: number, geo: ScrubGeometry): number {
  return Math.round(scrubPosition(x, geo));
}

/**
 * Where the selection lens sits while a thumb is down.
 *
 * It tracks the thumb rather than the nearest slot, so the lens is under
 * the finger the whole way instead of snapping ahead of it. Clamped to
 * the bar: a lens that slides out past the last slot looks broken and
 * would overhang the glass.
 */
export function lensLeft(x: number, geo: ScrubGeometry): number {
  const centred = x - geo.slot / 2;
  return clamp(centred, geo.padH, geo.padH + (geo.count - 1) * geo.slot);
}

/** where the lens rests when nothing is being dragged. */
export function lensRestLeft(index: number, geo: ScrubGeometry): number {
  return geo.padH + clamp(index, 0, geo.count - 1) * geo.slot;
}
