/**
 * Coarse distance.
 *
 * Discovery reports a band, never a number. A metre value is a coordinate in
 * disguise: readings from several intents would trilaterate a home address,
 * which is what an approximate location exists to prevent. Nothing here can
 * turn a band back into a distance, because the band is all it ever receives.
 *
 * Pure: no React Native, no Supabase.
 */

export const DISTANCE_BANDS = [
  'walking_distance',
  'nearby',
  'short_trip',
  'further_out',
  'unknown',
] as const;

export type DistanceBand = (typeof DISTANCE_BANDS)[number];

const LABELS: Record<DistanceBand, string> = {
  walking_distance: 'Walking distance',
  nearby: 'Nearby',
  short_trip: 'A short trip',
  further_out: 'Further out',
  unknown: 'Distance unknown',
};

export function describeDistanceBand(band: DistanceBand): string {
  return LABELS[band];
}

/**
 * `unknown` is a real answer, not a failure. An intent with no approximate
 * point is unplaced, and saying so is more honest than implying it is close.
 */
export function isPlaced(band: DistanceBand): boolean {
  return band !== 'unknown';
}

export function parseDistanceBand(value: string): DistanceBand {
  return (DISTANCE_BANDS as readonly string[]).includes(value)
    ? (value as DistanceBand)
    : 'unknown';
}
