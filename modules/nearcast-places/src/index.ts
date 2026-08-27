import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

/**
 * TypeScript facade around the NearcastPlaces native module. Only
 * available on iOS — the module ships iOS-only, so callers should
 * `if (isAvailable())` before using it and fall back on Android.
 *
 * isAvailable() is a synchronous call into native code that returns
 * true only when the module is actually linked. If the app hasn't
 * been prebuilt with the module yet, requireOptionalNativeModule
 * returns null and this reports false.
 */

export type NativePlaceSuggestion = {
  id: string;
  primary: string;
  secondary: string;
};

export type NativePlaceCoord = {
  latitude: number;
  longitude: number;
  formatted: string;
};

type NativeApi = {
  isAvailable(): boolean;
  search(
    query: string,
    biasLatitude: number | null,
    biasLongitude: number | null,
    biasSpan: number | null,
  ): Promise<NativePlaceSuggestion[]>;
  resolve(id: string): Promise<NativePlaceCoord | null>;
};

const native = requireOptionalNativeModule<NativeApi>('NearcastPlaces');

export function isAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  if (native === null) return false;
  try {
    return native.isAvailable();
  } catch {
    return false;
  }
}

export async function search(
  query: string,
  bias?: { latitude: number; longitude: number; span?: number },
): Promise<readonly NativePlaceSuggestion[]> {
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

export async function resolve(id: string): Promise<NativePlaceCoord | null> {
  if (!native) return null;
  try {
    return await native.resolve(id);
  } catch {
    return null;
  }
}
