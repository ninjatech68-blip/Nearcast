import { z } from 'zod';

import { INTENT_PRIMITIVES, type IntentPrimitive } from '@/features/intents/domain/intent';

/**
 * Intent drafting.
 *
 * The public and private halves are separate objects rather than one record
 * with sensitive fields mixed in. That is the whole point: a screen that
 * renders the public projection is handed `publicDraft` and structurally
 * cannot reach an exact address or a phone number, so "exact details never
 * enter public context" is enforced by the shape rather than by remembering to
 * filter. The database mirrors the same split across `intent_context` and
 * `intent_private`.
 *
 * Pure: no React Native, no Supabase, no storage.
 */

export const STATEMENT_MAX_LENGTH = 500;
export const RESPONSE_ACTION_MAX_LENGTH = 40;

/** MUST-013 requires an explicit expiry with a safe default proposed by us. */
export const DEFAULT_EXPIRY_HOURS = 24;

export function proposeExpiry(now: Date): Date {
  return new Date(now.getTime() + DEFAULT_EXPIRY_HOURS * 3_600_000);
}

export type PublicDraft = {
  primitive: IntentPrimitive | null;
  statement: string;
  responseAction: string;
  expiresAt: string;
  startsAt: string | null;
  deadlineAt: string | null;
  quantity: number | null;
  priceMinor: number | null;
  currency: string | null;
  approximatePlace: string | null;
  requirements: string[];
};

export type PrivateDraft = {
  exactAddress: string | null;
  privateContact: string | null;
  coordinationNotes: string | null;
};

export type IntentDraft = {
  publicDraft: PublicDraft;
  privateDraft: PrivateDraft;
  updatedAt: string;
};

export function createEmptyDraft(now: Date): IntentDraft {
  return {
    publicDraft: {
      primitive: null,
      statement: '',
      responseAction: '',
      expiresAt: proposeExpiry(now).toISOString(),
      startsAt: null,
      deadlineAt: null,
      quantity: null,
      priceMinor: null,
      currency: null,
      approximatePlace: null,
      requirements: [],
    },
    privateDraft: {
      exactAddress: null,
      privateContact: null,
      coordinationNotes: null,
    },
    updatedAt: now.toISOString(),
  };
}

const nullableTrimmed = z
  .string()
  .transform((value) => {
    const trimmed = value.trim();

    return trimmed.length === 0 ? null : trimmed;
  })
  .nullable();

export const publicDraftSchema = z.object({
  primitive: z.enum(INTENT_PRIMITIVES).nullable(),
  statement: z.string().max(STATEMENT_MAX_LENGTH),
  responseAction: z.string().max(RESPONSE_ACTION_MAX_LENGTH),
  expiresAt: z.string(),
  startsAt: z.string().nullable(),
  deadlineAt: z.string().nullable(),
  quantity: z.number().positive().nullable(),
  priceMinor: z.number().int().nonnegative().nullable(),
  currency: z.string().length(3).nullable(),
  approximatePlace: nullableTrimmed,
  requirements: z.array(z.string().trim().min(1)).max(10),
});

export const privateDraftSchema = z.object({
  exactAddress: nullableTrimmed,
  privateContact: nullableTrimmed,
  coordinationNotes: nullableTrimmed,
});

export const intentDraftSchema = z.object({
  publicDraft: publicDraftSchema,
  privateDraft: privateDraftSchema,
  updatedAt: z.string(),
});

/**
 * Everything that stops a draft being publishable, in the order a person meets
 * it on screen. Returned as a list rather than a single error so the review
 * screen can show all remaining work at once.
 */
export function findDraftProblems(draft: IntentDraft, now: Date): string[] {
  const problems: string[] = [];
  const { publicDraft } = draft;
  const statement = publicDraft.statement.trim();

  if (publicDraft.primitive === null) {
    problems.push('Choose whether this is a request, an offer, or a plan');
  }

  if (statement.length === 0) {
    problems.push('Write what you need in a sentence');
  }

  if (statement.length > STATEMENT_MAX_LENGTH) {
    problems.push(`Shorten the statement to ${STATEMENT_MAX_LENGTH} characters`);
  }

  if (publicDraft.responseAction.trim().length === 0) {
    problems.push('Say what a helpful reply looks like');
  }

  if (new Date(publicDraft.expiresAt).getTime() <= now.getTime()) {
    problems.push('Choose an expiry in the future');
  }

  if (
    (publicDraft.priceMinor === null) !== (publicDraft.currency === null)
  ) {
    problems.push('A price needs a currency, and a currency needs a price');
  }

  return problems;
}

export function isPublishable(draft: IntentDraft, now: Date): boolean {
  return findDraftProblems(draft, now).length === 0;
}

export type DisclosureItem = {
  label: string;
  detail: string;
};

export type Disclosure = {
  visibleNow: DisclosureItem[];
  visibleAfterAction: DisclosureItem[];
  heldBack: DisclosureItem[];
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

/**
 * What a draft discloses, and when.
 *
 * Built only from `publicDraft`, so a private value cannot reach the
 * "visible" lists even by mistake. `heldBack` names the private fields the
 * person has filled in without repeating their contents, so they can see what
 * is being withheld without the screen restating a home address.
 */
export function describeDisclosure(draft: IntentDraft): Disclosure {
  const { publicDraft, privateDraft } = draft;

  const visibleAfterAction: DisclosureItem[] = [
    { label: 'Your statement', detail: publicDraft.statement.trim() },
    { label: 'Expires', detail: formatDate(publicDraft.expiresAt) },
  ];

  if (publicDraft.approximatePlace !== null) {
    visibleAfterAction.push({
      label: 'Approximate area',
      detail: publicDraft.approximatePlace,
    });
  }

  if (publicDraft.startsAt !== null) {
    visibleAfterAction.push({ label: 'Starts', detail: formatDate(publicDraft.startsAt) });
  }

  if (publicDraft.deadlineAt !== null) {
    visibleAfterAction.push({ label: 'By', detail: formatDate(publicDraft.deadlineAt) });
  }

  if (publicDraft.quantity !== null) {
    visibleAfterAction.push({ label: 'How many', detail: String(publicDraft.quantity) });
  }

  if (publicDraft.priceMinor !== null && publicDraft.currency !== null) {
    visibleAfterAction.push({
      label: 'Price',
      detail: `${(publicDraft.priceMinor / 100).toFixed(2)} ${publicDraft.currency}`,
    });
  }

  for (const requirement of publicDraft.requirements) {
    visibleAfterAction.push({ label: 'Requirement', detail: requirement });
  }

  const heldBack: DisclosureItem[] = [];

  if (privateDraft.exactAddress !== null) {
    heldBack.push({
      label: 'Exact address',
      detail: 'Shared only with someone you accept, after you release it',
    });
  }

  if (privateDraft.privateContact !== null) {
    heldBack.push({
      label: 'Contact details',
      detail: 'Shared only with someone you accept, after you release it',
    });
  }

  if (privateDraft.coordinationNotes !== null) {
    heldBack.push({
      label: 'Coordination notes',
      detail: 'Shared only with someone you accept, after you release it',
    });
  }

  return {
    // A draft has not been published, so nothing is visible to anyone yet.
    visibleNow: [],
    visibleAfterAction,
    heldBack,
  };
}
