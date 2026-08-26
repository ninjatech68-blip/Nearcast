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

/**
 * The publish boundary. Doc 05 requires a shared schema at every trust
 * boundary, mirrored by database constraints — this is the client half, and
 * every rule here is enforced again in PostgreSQL.
 */
export const intentPublishSchema = intentDraftSchema.extend({
  responseAction: z.string().trim().min(1).max(40),
  approximatePlace: z.string().trim().min(1).max(120).nullable(),
  publicLinkEnabled: z.boolean(),
  showFirstName: z.boolean(),
  idempotencyKey: z.string().min(1),
});

export type IntentDraft = z.infer<typeof intentDraftSchema>;
export type IntentPublishInput = z.infer<typeof intentPublishSchema>;
export type IntentPrimitive = (typeof INTENT_PRIMITIVES)[number];
export type IntentReachLevel = (typeof INTENT_REACH_LEVELS)[number];

/**
 * What a published intent's owner may still change. Every field here can move
 * the terms someone already responded to, which is why the server records the
 * change (MUST-017).
 */
export const intentEditSchema = z
  .object({
    statement: z.string().trim().min(1).max(500),
    expiresAt: z.iso.datetime(),
    startsAt: z.iso.datetime().nullable(),
    deadlineAt: z.iso.datetime().nullable(),
    quantity: z.number().positive().nullable(),
    priceMinor: z.number().int().nonnegative().nullable(),
    currency: z.string().trim().length(3).nullable(),
    approximatePlace: z.string().trim().min(1).max(120).nullable(),
    requirements: z.array(z.string().trim().min(1).max(120)).max(10),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Change something first.',
  });

export type IntentEdit = z.infer<typeof intentEditSchema>;

const EDIT_FIELD_COLUMNS: Record<keyof IntentEdit, string> = {
  statement: 'statement',
  expiresAt: 'expires_at',
  startsAt: 'starts_at',
  deadlineAt: 'deadline_at',
  quantity: 'quantity',
  priceMinor: 'price_minor',
  currency: 'currency',
  approximatePlace: 'approximate_place',
  requirements: 'requirements',
};

/** Maps a validated edit onto the column names `update_intent` accepts. */
export function toChangePayload(edit: IntentEdit): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(edit)) {
    const column = EDIT_FIELD_COLUMNS[key as keyof IntentEdit];
    if (column) payload[column] = value;
  }
  return payload;
}

/**
 * The categories the server records on a material edit. These are the four
 * named in MUST-017, plus the statement itself, because a rewritten statement
 * changes what a respondent agreed to just as surely as a changed price.
 */
export const MATERIAL_EDIT_CATEGORIES = [
  'statement',
  'time',
  'price',
  'location',
  'eligibility',
] as const;

export type MaterialEditCategory = (typeof MATERIAL_EDIT_CATEGORIES)[number];

const CATEGORY_PHRASES: Record<MaterialEditCategory, string> = {
  statement: 'what is being asked',
  time: 'the timing',
  price: 'the price',
  location: 'the area',
  eligibility: 'who it is for',
};

function isCategory(value: string): value is MaterialEditCategory {
  return (MATERIAL_EDIT_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Plain description of a material edit, for respondents. It names what moved
 * and never invents detail: the current values are on the intent itself.
 */
export function describeMaterialEdit(fields: readonly string[]): string {
  const phrases = fields.filter(isCategory).map((field) => CATEGORY_PHRASES[field]);
  if (phrases.length === 0) return 'This intent changed after you responded.';

  const list =
    phrases.length === 1
      ? phrases[0]
      : `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`;
  return `${list.charAt(0).toUpperCase()}${list.slice(1)} changed after you responded.`;
}
