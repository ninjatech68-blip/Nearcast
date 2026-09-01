/**
 * "how far away is this?", in words.
 *
 * The feed used to print the cast's approximate place NAME. Testers
 * are spread across cities, so a name they have never heard says
 * nothing about whether they can get there; a distance does.
 *
 * The number arrives from `my_feed()` already rounded to 50 m — the
 * rounding is server-side so repeated reads cannot be multilaterated
 * into a sharper position than the approximate point the caster
 * published. This only phrases it, and coarsens further as it goes out:
 * nobody needs "1,347 m".
 *
 * Returns null when there is no distance to state. The caller falls
 * back to the place name; it never invents a number.
 */
export function distanceLabel(metres: number | null | undefined): string | null {
  if (metres === null || metres === undefined) return null;
  if (!Number.isFinite(metres) || metres < 0) return null;
  if (metres < 100) return 'a few steps away';
  if (metres < 1000) return `${Math.round(metres / 50) * 50} m away`;
  const km = metres / 1000;
  if (km < 10) return `${(Math.round(km * 10) / 10).toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}
