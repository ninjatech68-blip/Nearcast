import * as Location from 'expo-location';

/**
 * area helpers for compose. everything here resolves to NAMES at
 * neighborhood granularity — coordinates never leave this module and
 * are never stored on a cast (product law: casts show the area only).
 *
 * suggestions carry a richer address for tap-in-the-list clarity
 * (a la Google Maps autocomplete), while the stored value on the cast
 * remains just the neighborhood name.
 */

export type AreaSuggestion = {
  /** what the cast will store (short neighborhood name) */
  name: string;
  /** full address for the list row: "koramangala · bengaluru · karnataka" */
  full: string;
  /** the coordinate used only to pin the map — never persisted */
  coord?: { latitude: number; longitude: number };
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
 * autocomplete list. each entry carries the short neighborhood name
 * (what the cast stores), the full address (what the list row shows),
 * and a coord (only for pinning the map — never persisted).
 */
export async function suggestAreas(query: string): Promise<readonly AreaSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
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
    // if geocoding returned nothing readable, at least offer the typed name.
    if (suggestions.length === 0) {
      suggestions.push({ name: trimmed.toLowerCase(), full: trimmed.toLowerCase() });
    }
    return suggestions;
  } catch {
    return [];
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
