/**
 * Where a drag on the dock is pointing, and where the selection lens sits.
 *
 * Kept pure and separate from the component because this is where the
 * bugs live: a touch that jumps the pager to the finger instead of moving
 * from where you were, a lens that runs past the end of the bar, a
 * release that lands on the wrong page. None of that needs a renderer to
 * catch.
 *
 * The bar is `padH` of padding, then N slots of `slot` width, one slot per
 * page.
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
 * Where the selection lens sits for a page position, which may be
 * fractional while a swipe or a drag is mid-flight -- 0.5 is halfway
 * between the first slot and the second, which is exactly where the lens
 * belongs when the pager is halfway between two pages.
 *
 * Clamped to the bar: a lens that slides out past the last slot would sit
 * over the glass edge with nothing under it.
 */
export function lensRestLeft(position: number, geo: ScrubGeometry): number {
  return geo.padH + clamp(position, 0, geo.count - 1) * geo.slot;
}

/**
 * A drag that began on page `startPos` and has moved `dx` points along the
 * bar, as a fractional page position.
 *
 * RELATIVE, not absolute. An absolute scrub -- thumb position mapped
 * straight to a page -- makes the first touch jump the pager to wherever
 * the finger happens to land, and then only tracks in the one direction
 * that agrees with which side of the bar the finger is on. Measuring from
 * the page the drag STARTED on means a touch stays put and moves in either
 * direction from there.
 *
 * One slot of travel is one page. Clamped to the ends so a drag past the
 * last page does not run off the bar.
 */
export function dragPosition(startPos: number, dx: number, geo: ScrubGeometry): number {
  return clamp(startPos + dx / geo.slot, 0, geo.count - 1);
}
