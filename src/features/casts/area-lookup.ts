import * as Location from 'expo-location';

import * as NativePlaces from './native-places';

/**
 * area helpers for compose. everything here resolves to NAMES at
 * neighborhood granularity — coordinates never leave this module and
 * are never stored on a cast (product law: casts show the area only).
 *
 * suggestions carry a richer address for tap-in-the-list clarity
 * (a la Google Maps autocomplete), while the stored value on the cast
 * remains just the neighborhood name.
 *
 * Two suggestion backends:
 *   1. Google Places Autocomplete — POI + street level ("Social,
 *      Elante Mall", "Gulmohar Trends, Dhakoli"). Preferred when the
 *      EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is configured.
 *   2. expo-location geocode/reverse-geocode — neighborhood level
 *      only. Fallback when the Places key is absent.
 */

export type AreaSuggestion = {
  /** what the cast will store (short neighborhood name / POI name) */
  name: string;
  /** full address for the list row: "Elante Mall, Sector 26, Chandigarh" */
  full: string;
  /** the coordinate used only to pin the map — never persisted */
  coord?: { latitude: number; longitude: number };
  /** identifier from the native completer, if that produced this */
  placeId?: string;
  /** which backend produced this — decides how resolve() looks up the coord */
  source?: 'native' | 'geocode';
};

function namesFrom(address: Location.LocationGeocodedAddress): string[] {
  const candidates = [address.district, address.subregion, address.city];
  const names: string[] = [];
  for (const candidate of candidates) {
    const name = candidate?.trim().toLowerCase();
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

function fullFrom(address: Location.LocationGeocodedAddress): string {
  const parts = [address.district, address.city, address.region, address.country]
    .map((p) => p?.trim())
    .filter((p): p is string => !!p);
  return parts.join(' · ').toLowerCase();
}

/** ring of sample points around a coordinate, so we find NEIGHBORS, not just here. */
function ringAround(latitude: number, longitude: number): { latitude: number; longitude: number }[] {
  const points = [{ latitude, longitude }];
  const latPerKm = 1 / 110.574;
  const lonPerKm = 1 / (111.32 * Math.cos((latitude * Math.PI) / 180) || 1);
  for (const km of [0.9, 2.2]) {
    for (let bearing = 0; bearing < 360; bearing += 90) {
      const radians = (bearing * Math.PI) / 180;
      points.push({
        latitude: latitude + Math.cos(radians) * km * latPerKm,
        longitude: longitude + Math.sin(radians) * km * lonPerKm,
      });
    }
  }
  return points;
}

async function namesAround(latitude: number, longitude: number, limit: number): Promise<string[]> {
  const names: string[] = [];
  for (const point of ringAround(latitude, longitude)) {
    if (names.length >= limit) break;
    try {
      const addresses = await Location.reverseGeocodeAsync(point);
      for (const name of addresses.flatMap(namesFrom)) {
        if (!names.includes(name) && names.length < limit) names.push(name);
      }
    } catch {
      // one failed sample never fails the whole lookup
    }
  }
  return names;
}

export type AreaLookupResult =
  | { ok: true; areas: string[]; suggestions?: AreaSuggestion[] }
  | { ok: false; reason: 'permission' | 'unavailable' | 'not-found' };

/**
 * richer geocoded suggestions for the search field — a Maps-style
 * autocomplete list. each entry carries a place name, the full
 * address (what the list row shows), and a coord (only for pinning
 * the map — never persisted).
 *
 * On iOS the native completer returns POI-level results like
 * "Social, Elante Mall, Sector 26, Chandigarh". Elsewhere this falls back
 * to expo-location's neighbourhood-only geocode.
 *
 * Every tier runs on the device. Nothing here tells a third party which
 * places a person is asking about, which is the whole reason an
 * approximate area exists.
 */
export async function suggestAreas(
  query: string,
  bias?: { latitude: number; longitude: number; span?: number },
): Promise<readonly AreaSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Preferred (iOS): MKLocalSearchCompleter via the local
  // nearcast-places native module. No API key, no billing.
  if (NativePlaces.isAvailable()) {
    const results = await NativePlaces.search(trimmed, bias);
    if (results.length > 0) {
      return results.map((r) => ({
        name: r.primary,
        full: r.secondary ? `${r.primary}, ${r.secondary}` : r.primary,
        placeId: r.id,
        source: 'native' as const,
      }));
    }
  }

  // Fallback: expo-location geocode + reverse-geocode. On-device, like the
  // completer above.
  //
  // A Google Places tier used to sit between the two. It was removed: it
  // needed EXPO_PUBLIC_GOOGLE_PLACES_API_KEY, which a release build inlines
  // into the bundle where anyone can read it, and it sent every area a
  // person typed to a third party. On iOS it was never reached anyway,
  // because the native completer above answers first. Android loses the
  // POI-level results and falls through to the geocode below.
  try {
    const matches = await Location.geocodeAsync(trimmed);
    const suggestions: AreaSuggestion[] = [];
    const seen = new Set<string>();
    for (const match of matches.slice(0, 5)) {
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: match.latitude,
          longitude: match.longitude,
        });
        for (const address of addresses) {
          const names = namesFrom(address);
          if (names.length === 0) continue;
          const name = names[0];
          const full = fullFrom(address) || name;
          const key = `${name}|${full}`;
          if (seen.has(key)) continue;
          seen.add(key);
          suggestions.push({
            name,
            full,
            coord: { latitude: match.latitude, longitude: match.longitude },
          });
        }
      } catch {
        // ignore one bad reverse-geocode
      }
    }
    if (suggestions.length === 0) {
      suggestions.push({ name: trimmed.toLowerCase(), full: trimmed.toLowerCase() });
    }
    return suggestions;
  } catch {
    return [];
  }
}

/**
 * resolve a picked suggestion to a coord (for the map pin). The native
 * completer hands back an identifier rather than a coordinate, so that
 * one is looked up; everything else already carries its coord or falls
 * back to an on-device geocode.
 */
export async function resolveSuggestion(
  suggestion: AreaSuggestion,
): Promise<{ latitude: number; longitude: number } | null> {
  if (suggestion.coord) return suggestion.coord;
  if (suggestion.source === 'native' && suggestion.placeId) {
    const detail = await NativePlaces.resolve(suggestion.placeId);
    if (detail) return { latitude: detail.latitude, longitude: detail.longitude };
  }
  try {
    const matches = await Location.geocodeAsync(suggestion.name);
    if (matches[0]) return { latitude: matches[0].latitude, longitude: matches[0].longitude };
  } catch {
    // no geocode either — nothing to pin
  }
  return null;
}

/**
 * Where am I, as a single area with its point.
 *
 * The onboarding home step uses this to fill the home area from the
 * device rather than making someone search a map for the place they
 * are standing in. It returns the CLOSEST neighbourhood name and the
 * device coordinate to pin it — approximate by construction, and the
 * point is rounded before it is ever stored.
 */
export async function myCurrentArea(): Promise<
  | { ok: true; name: string; latitude: number; longitude: number }
  | { ok: false; reason: 'permission' | 'not-found' | 'unavailable' }
> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'permission' };

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = position.coords;
    const names = await namesAround(latitude, longitude, 1);
    if (names.length === 0) return { ok: false, reason: 'not-found' };
    return { ok: true, name: names[0], latitude, longitude };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** where am I → the neighborhoods around me, nearest first. */
export async function areasNearMe(): Promise<AreaLookupResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'permission' };

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const areas = await namesAround(position.coords.latitude, position.coords.longitude, 8);

    if (areas.length === 0) return { ok: false, reason: 'not-found' };
    return { ok: true, areas };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** search areas by name ("koramangala", "bandra") → that place and what's around it. */
export async function searchAreas(query: string): Promise<AreaLookupResult> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { ok: false, reason: 'not-found' };
  try {
    const matches = await Location.geocodeAsync(trimmed);
    const typed = trimmed.toLowerCase();
    if (matches.length === 0) return { ok: false, reason: 'not-found' };

    const areas: string[] = [];
    for (const match of matches.slice(0, 2)) {
      for (const name of await namesAround(match.latitude, match.longitude, 6)) {
        if (!areas.includes(name)) areas.push(name);
      }
    }
    // the typed name itself is always a valid choice: areas are names, not pins
    if (!areas.includes(typed)) areas.unshift(typed);
    return { ok: true, areas: areas.slice(0, 8) };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
