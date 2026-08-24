import { z } from 'zod';

export const INTENT_PRIMITIVES = ['request', 'offer', 'plan'] as const;
export const INTENT_REACH_LEVELS = [
  'origin_only',
  'adjacent_network',
  'nearby_relevant',
  'broader_approved',
] as const;

export const intentDraftSchema = z.object({
  primitive: z.enum(INTENT_PRIMITIVES),
  statement: z.string().trim().min(1).max(500),
  expiresAt: z.iso.datetime(),
  reach: z.enum(INTENT_REACH_LEVELS),
});

export type IntentDraft = z.infer<typeof intentDraftSchema>;
export type IntentPrimitive = (typeof INTENT_PRIMITIVES)[number];
export type IntentReachLevel = (typeof INTENT_REACH_LEVELS)[number];
