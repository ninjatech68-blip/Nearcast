import * as Location from 'expo-location';

import type { GeoPoint } from './domain/geo';

/**
 * Resolve an area NAME to an approximate centre.
 *
 * A cast is delivered by distance, and distance needs a point on both
 * sides. The area picker sets one; this is the safety net for a cast
 * that reaches publish with only a name, so the cast still carries a
 * centre and its radius actually gates who it reaches. Best-effort:
 * returns null when the name cannot be placed, and the caller publishes
 * with the name alone (coarse, but never silently un-delivered).
 */
export async function geocodeArea(area: string): Promise<GeoPoint | null> {
  try {
    const matches = await Location.geocodeAsync(area);
    const first = matches[0];
    if (!first) return null;
    return { latitude: first.latitude, longitude: first.longitude };
  } catch {
    return null;
  }
}
