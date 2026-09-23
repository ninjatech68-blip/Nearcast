const METERS_PER_UNIT = { km: 1000, mi: 1609.344 } as const;
export type DistanceUnit = keyof typeof METERS_PER_UNIT;

/**
 * Distance to a plan's snapped point (06 §9.6). Plans only, never people.
 * Nothing more precise than "under 1", and never decimals.
 */
export function planDistance(meters: number, unit: DistanceUnit): string {
  if (!Number.isFinite(meters) || meters < 0) throw new Error(`invalid distance: ${meters}`);
  const units = meters / METERS_PER_UNIT[unit];
  if (units < 1) return `under 1 ${unit}`;
  return `≈ ${Math.round(units)} ${unit}`;
}
