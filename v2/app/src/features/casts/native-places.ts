import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

/**
 * Bridge to the NearcastPlaces native module (MKLocalSearchCompleter).
 *
 * IMPORTANT: we look the module up in the NATIVE REGISTRY by its
 * `Name("NearcastPlaces")` — we do NOT `require('nearcast-places')`.
 *
 * Local Expo modules under `modules/` are autolinked on the native
 * side by directory scan (expo-modules-autolinking finds them via
 * their expo-module.config.json). They are NOT npm packages, so
 * Metro cannot resolve them by package name and any
 * `require('nearcast-places')` throws at runtime — which is exactly
 * how this silently fell back to the weak geocode path before.
 *
 * requireOptionalNativeModule returns null when the module isn't in
 * the binary (Android, or an iOS build made before the module was
 * added), so callers can fall back cleanly.
 */

export type NativeSuggestion = { id: string; primary: string; secondary: string };
export type NativeCoord = { latitude: number; longitude: number; formatted: string };

type NativeApi = {
  isAvailable(): boolean;
  search(
    query: string,
    biasLatitude: number | null,
    biasLongitude: number | null,
    biasSpan: number | null,
  ): Promise<NativeSuggestion[]>;
  resolve(id: string): Promise<NativeCoord | null>;
};

const native =
  Platform.OS === 'ios' ? requireOptionalNativeModule<NativeApi>('NearcastPlaces') : null;

export function isAvailable(): boolean {
  if (!native) return false;
  try {
    return native.isAvailable();
  } catch {
    return false;
  }
}

export async function search(
  query: string,
  bias?: { latitude: number; longitude: number; span?: number },
): Promise<readonly NativeSuggestion[]> {
  if (!native) return [];
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  try {
    return await native.search(
      trimmed,
      bias?.latitude ?? null,
      bias?.longitude ?? null,
      bias?.span ?? null,
    );
  } catch {
    return [];
  }
}

export async function resolve(id: string): Promise<NativeCoord | null> {
  if (!native) return null;
  try {
    return await native.resolve(id);
  } catch {
    return null;
  }
}
