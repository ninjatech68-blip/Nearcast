import { z } from 'zod';

/**
 * a cast is category × statement × reach × expiry. the category both
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

export const INTENT_REACH_LEVELS = [
  'origin_only',
  'adjacent_network',
  'nearby_relevant',
  'broader_approved',
] as const;

export const intentDraftSchema = z.object({
  category: z.enum(CAST_CATEGORIES),
  statement: z.string().trim().min(1).max(140),
  expiresAt: z.iso.datetime(),
  reach: z.enum(INTENT_REACH_LEVELS),
});

export type IntentDraft = z.infer<typeof intentDraftSchema>;
export type CastCategory = (typeof CAST_CATEGORIES)[number];
export type IntentReachLevel = (typeof INTENT_REACH_LEVELS)[number];
