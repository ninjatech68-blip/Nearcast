import * as Location from 'expo-location';

/**
 * area helpers for compose. everything here resolves to NAMES at
 * neighborhood granularity — coordinates never leave this module and
 * are never stored on a cast (product law: casts show the area only).
 */

function namesFrom(address: Location.LocationGeocodedAddress): string[] {
  const candidates = [address.district, address.subregion, address.city];
  const names: string[] = [];
  for (const candidate of candidates) {
    const name = candidate?.trim().toLowerCase();
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

export type AreaLookupResult =
  | { ok: true; areas: string[] }
  | { ok: false; reason: 'permission' | 'unavailable' | 'not-found' };

/** one-shot: where am I → nearby area names. */
export async function areasNearMe(): Promise<AreaLookupResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'permission' };

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const addresses = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    const areas = addresses.flatMap(namesFrom).filter((name, index, all) => all.indexOf(name) === index);
    if (areas.length === 0) return { ok: false, reason: 'not-found' };
    return { ok: true, areas: areas.slice(0, 4) };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** search areas by name ("koramangala", "bandra") → normalized nearby names. */
export async function searchAreas(query: string): Promise<AreaLookupResult> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { ok: false, reason: 'not-found' };
  try {
    const matches = await Location.geocodeAsync(trimmed);
    if (matches.length === 0) return { ok: false, reason: 'not-found' };

    const areas: string[] = [];
    for (const match of matches.slice(0, 2)) {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: match.latitude,
        longitude: match.longitude,
      });
      for (const name of addresses.flatMap(namesFrom)) {
        if (!areas.includes(name)) areas.push(name);
      }
    }
    // the typed name itself is always a valid choice: areas are names, not pins
    const typed = trimmed.toLowerCase();
    if (!areas.includes(typed)) areas.unshift(typed);
    return { ok: true, areas: areas.slice(0, 4) };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
