import { z } from 'zod';

import {
  RESPONSE_ACTION_MAX_LENGTH,
  STATEMENT_MAX_LENGTH,
  type IntentDraft,
} from '@/features/intents/create/domain/draft';
import { INTENT_PRIMITIVES, INTENT_REACH_LEVELS } from '@/features/intents/domain/intent';

/**
 * The publish request.
 *
 * API Contracts describes `publish-intent` as taking a draft ID. The draft is
 * device-local by the screen contract, so there is no server row to name and
 * the request carries the draft's content instead. The idempotency key does
 * what the draft ID would have: it makes a retry safe, and it does so across
 * devices, which a local identifier could not.
 *
 * Validated here with Zod and again by PostgreSQL, which owns the constraints
 * this schema mirrors.
 */

export const publishRequestSchema = z.object({
  primitive: z.enum(INTENT_PRIMITIVES),
  statement: z.string().trim().min(1).max(STATEMENT_MAX_LENGTH),
  responseAction: z.string().trim().min(1).max(RESPONSE_ACTION_MAX_LENGTH),
  expiresAt: z.string(),
  reach: z.enum(INTENT_REACH_LEVELS),
  startsAt: z.string().nullable(),
  deadlineAt: z.string().nullable(),
  quantity: z.number().positive().nullable(),
  priceMinor: z.number().int().nonnegative().nullable(),
  currency: z.string().length(3).nullable(),
  approximatePlace: z.string().nullable(),
  approximateLongitude: z.number().nullable(),
  approximateLatitude: z.number().nullable(),
  requirements: z.array(z.string().trim().min(1)),
  exactAddress: z.string().nullable(),
  privateContact: z.string().nullable(),
  coordinationNotes: z.string().nullable(),
  // `guid`, not `uuid`: the column is a Postgres uuid, which accepts any
  // 8-4-4-4-12 hex value. Enforcing the RFC version nibble here would reject
  // keys the database itself stores happily.
  requestKey: z.guid(),
});

export type PublishRequest = z.infer<typeof publishRequestSchema>;

export type PublishRequestResult =
  | { ok: true; request: PublishRequest }
  | { ok: false; problems: string[] };

/**
 * Builds a publish request from a draft. Returns problems rather than throwing
 * so the review screen can list everything still outstanding at once.
 */
export function buildPublishRequest(
  draft: IntentDraft,
  reach: (typeof INTENT_REACH_LEVELS)[number],
  requestKey: string,
): PublishRequestResult {
  const { publicDraft, privateDraft } = draft;

  const parsed = publishRequestSchema.safeParse({
    primitive: publicDraft.primitive,
    statement: publicDraft.statement,
    responseAction: publicDraft.responseAction,
    expiresAt: publicDraft.expiresAt,
    reach,
    startsAt: publicDraft.startsAt,
    deadlineAt: publicDraft.deadlineAt,
    quantity: publicDraft.quantity,
    priceMinor: publicDraft.priceMinor,
    currency: publicDraft.currency,
    approximatePlace: publicDraft.approximatePlace,
    approximateLongitude: publicDraft.approximateLongitude,
    approximateLatitude: publicDraft.approximateLatitude,
    requirements: publicDraft.requirements,
    exactAddress: privateDraft.exactAddress,
    privateContact: privateDraft.privateContact,
    coordinationNotes: privateDraft.coordinationNotes,
    requestKey,
  });

  if (parsed.success) return { ok: true, request: parsed.data };

  return {
    ok: false,
    problems: parsed.error.issues.map((issue) => issue.message),
  };
}
