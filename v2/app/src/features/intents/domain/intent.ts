import { z } from 'zod';

/**
 * a cast is category × statement × radius × expiry. the category both
 * names the cast and owns its poster color (see design-system/tokens).
 * the ask ("need two", "giving away") lives in the statement words.
 */
export const CAST_CATEGORIES = [
  'social',
  'sports',
  'food',
  'music',
  'travel',
  'games',
  'arts',
  'learning',
  'networking',
  'help',
] as const;

/**
 * How far a cast travels from its area, in kilometres. This replaced a
 * four-level reach ladder — see doc 19 §1. The bounds match the
 * `radius_km` check on `intent_reach`, so a draft this schema accepts
 * is a draft the database will accept.
 */
export const INTENT_RADIUS_KM_MIN = 1;
export const INTENT_RADIUS_KM_MAX = 100;

export const intentDraftSchema = z.object({
  category: z.enum(CAST_CATEGORIES),
  statement: z.string().trim().min(1).max(140),
  expiresAt: z.iso.datetime(),
  radiusKm: z.number().int().min(INTENT_RADIUS_KM_MIN).max(INTENT_RADIUS_KM_MAX),
});

export type IntentDraft = z.infer<typeof intentDraftSchema>;
export type CastCategory = (typeof CAST_CATEGORIES)[number];
