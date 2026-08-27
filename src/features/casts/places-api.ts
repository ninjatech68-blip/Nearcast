/**
 * Google Places Autocomplete integration for the area picker.
 *
 * expo-location only knows how to geocode a name into a coord (and
 * reverse-geocode a coord into a name). It has no idea what "Social,
 * Elante Mall" is or "Gulmohar Trends, Dhakoli" is — those are POIs
 * and hyper-local place names that live in Google Places.
 *
 * To get the address-suggestion behaviour of the Maps app, we call
 * the Google Places Autocomplete endpoint directly. It returns
 * ranked predictions (POI names + street context) that we render as
 * the suggestion list, and Place Details for the coord when the
 * user picks one.
 *
 * Setup (once, before shipping):
 *   1. Create a Google Cloud project, enable "Places API (New) or Places API".
 *   2. Restrict the key to the Places API and to your app's bundle id.
 *   3. Add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=... to .env (Expo picks
 *      up EXPO_PUBLIC_* automatically at build time). For local
 *      testing, add it to your shell before `npm run start`.
 *
 * Without a key, the module returns null from every call and the
 * area lookup falls back to the older expo-location path — so the
 * app still works, just with weaker suggestions.
 *
 * Session token: Google bills lower rates when autocomplete + one
 * details call share a session token. We generate one per screen
 * mount and pass it along.
 */

export type PlaceSuggestion = {
  placeId: string;
  /** the highlighted main name, e.g. "Social" or "Gulmohar Trends" */
  primary: string;
  /** the address context under it, e.g. "Elante Mall, Sector 26, Chandigarh" */
  secondary: string;
};

export type PlaceCoord = {
  latitude: number;
  longitude: number;
  formatted: string;
};

const KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() ?? '';

export function placesEnabled(): boolean {
  return KEY.length > 0;
}

const AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

/** cheap session token — random enough for one autocomplete session. */
export function makeSessionToken(): string {
  const rand = Math.random().toString(36).slice(2, 12);
  return `s-${rand}-${rand.split('').reverse().join('')}`;
}

/**
 * ranked address suggestions. returns null when no API key is
 * configured (callers should fall back). returns [] when the API
 * responded but had no matches.
 */
export async function placesAutocomplete(
  query: string,
  sessionToken: string,
  opts?: { countryCode?: string; language?: string },
): Promise<readonly PlaceSuggestion[] | null> {
  if (!placesEnabled()) return null;
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({
    input: q,
    key: KEY,
    sessiontoken: sessionToken,
    language: opts?.language ?? 'en',
  });
  if (opts?.countryCode) params.set('components', `country:${opts.countryCode.toLowerCase()}`);

  try {
    const response = await fetch(`${AUTOCOMPLETE_URL}?${params.toString()}`);
    if (!response.ok) return [];
    const body = (await response.json()) as {
      status: string;
      predictions?: {
        place_id: string;
        structured_formatting?: { main_text?: string; secondary_text?: string };
        description?: string;
      }[];
    };
    if (body.status !== 'OK' && body.status !== 'ZERO_RESULTS') return [];
    return (body.predictions ?? []).map((p) => ({
      placeId: p.place_id,
      primary: p.structured_formatting?.main_text?.trim() ?? p.description?.trim() ?? '',
      secondary: p.structured_formatting?.secondary_text?.trim() ?? '',
    }));
  } catch {
    return [];
  }
}

/** resolve a picked prediction to a coord and formatted address. */
export async function placeDetails(
  placeId: string,
  sessionToken: string,
): Promise<PlaceCoord | null> {
  if (!placesEnabled()) return null;
  const params = new URLSearchParams({
    place_id: placeId,
    key: KEY,
    sessiontoken: sessionToken,
    fields: 'geometry,formatted_address,name',
  });
  try {
    const response = await fetch(`${DETAILS_URL}?${params.toString()}`);
    if (!response.ok) return null;
    const body = (await response.json()) as {
      status: string;
      result?: {
        geometry?: { location?: { lat?: number; lng?: number } };
        formatted_address?: string;
        name?: string;
      };
    };
    const loc = body.result?.geometry?.location;
    if (body.status !== 'OK' || !loc?.lat || !loc?.lng) return null;
    return {
      latitude: loc.lat,
      longitude: loc.lng,
      formatted: body.result?.formatted_address ?? body.result?.name ?? '',
    };
  } catch {
    return null;
  }
}
