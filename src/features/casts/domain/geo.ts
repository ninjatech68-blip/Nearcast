/**
 * Distance between approximate places.
 *
 * Everything here works on AREA CENTROIDS — the rough middle of a
 * neighbourhood — never on a person's position. That is the product
 * law restated as a module boundary: a cast carries the centre of an
 * area, a viewer carries the centre of their home area, and the only
 * question we ever ask is how far apart those two areas are.
 *
 * Nothing in here can answer "where is this person", because nothing
 * in here is ever given that.
 *
 * pure domain: no react, no supabase, no i/o.
 */

export type GeoPoint = { latitude: number; longitude: number };

/** the default a cast gets when the caster does not change it. */
export const DEFAULT_RADIUS_KM = 5;

/**
 * The choices offered when casting. Deliberately few and deliberately
 * starting at a distance that leaves your own street: the whole point
 * of the app is reaching people you do not already have in a group
 * chat, and a 1km option would just rebuild that group.
 */
export const RADIUS_CHOICES = [
  { km: 2, label: '2 km', sub: 'walkable' },
  { km: 5, label: '5 km', sub: 'a few neighbourhoods' },
  { km: 10, label: '10 km', sub: 'across town' },
  { km: 25, label: '25 km', sub: 'the whole city' },
] as const;

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** great-circle distance in kilometres. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Approximate centroids for the areas the fixture build knows about.
 * In production these come from intent_context.approximate_geography,
 * which the area picker already resolves when a pin is dropped.
 */
const AREA_CENTROIDS: Record<string, GeoPoint> = {
  indiranagar: { latitude: 12.9784, longitude: 77.6408 },
  koramangala: { latitude: 12.9352, longitude: 77.6245 },
  hsr: { latitude: 12.9116, longitude: 77.6474 },
  jayanagar: { latitude: 12.9250, longitude: 77.5938 },
  whitefield: { latitude: 12.9698, longitude: 77.7500 },
  'cubbon park': { latitude: 12.9763, longitude: 77.5929 },
};

export function centroidFor(area: string): GeoPoint | null {
  return AREA_CENTROIDS[area.trim().toLowerCase()] ?? null;
}

/**
 * Is the cast's area within `radiusKm` of any area the viewer counts
 * as theirs?
 *
 * When we cannot place either side on the map — an area name we have
 * no centroid for, which will be common as people type real places —
 * we fall back to name matching rather than guessing a distance.
 * Silently treating an unknown area as "far" would quietly stop
 * delivering casts, which is worse than a coarse match.
 */
export function withinRadius(
  castArea: string,
  viewerAreas: readonly string[],
  radiusKm: number,
): boolean {
  const castPoint = centroidFor(castArea);
  const normalizedViewerAreas = viewerAreas.map((a) => a.trim().toLowerCase());

  if (!castPoint) {
    return normalizedViewerAreas.includes(castArea.trim().toLowerCase());
  }

  let anyPlaced = false;
  for (const area of normalizedViewerAreas) {
    const point = centroidFor(area);
    if (!point) continue;
    anyPlaced = true;
    if (distanceKm(castPoint, point) <= radiusKm) return true;
  }

  // none of the viewer's areas could be placed — fall back to names
  if (!anyPlaced) return normalizedViewerAreas.includes(castArea.trim().toLowerCase());
  return false;
}
