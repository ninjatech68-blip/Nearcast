import { z } from 'zod';

import { INTENT_PRIMITIVES, INTENT_REACH_LEVELS } from './intent';

/**
 * A composer draft held on the device. MUST-015: a draft survives app restarts
 * and temporary network loss. It is local until published — nothing here is
 * sent anywhere before the publish transaction, and account deletion clears it.
 */
export const localDraftSchema = z.object({
  primitive: z.enum(INTENT_PRIMITIVES),
  statement: z.string().max(500),
  reach: z.enum(INTENT_REACH_LEVELS),
  publicLinkEnabled: z.boolean(),
  showFirstName: z.boolean(),
  updatedAt: z.iso.datetime(),
});

export type LocalDraft = z.infer<typeof localDraftSchema>;

export function serializeDraft(draft: LocalDraft): string {
  return JSON.stringify(draft);
}

/**
 * Reads a stored draft back. Anything unreadable — corrupted rows, a shape from
 * an older build — is treated as no draft at all rather than as partial state a
 * screen might half-render.
 */
export function parseStoredDraft(raw: string | null | undefined): LocalDraft | null {
  if (!raw) return null;
  try {
    const parsed = localDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** True when a draft holds nothing worth restoring. */
export function isEmptyDraft(draft: LocalDraft): boolean {
  return draft.statement.trim().length === 0;
}

const NETWORK_FAILURE = /network request failed|failed to fetch|networkerror|network error/i;

/**
 * Distinguishes "we could not reach the server" from "the server refused".
 * Publishing must never claim success while offline, and the two failures need
 * different copy: one is worth retrying, the other is not.
 */
export function isNetworkFailure(message: string | null | undefined): boolean {
  return typeof message === 'string' && NETWORK_FAILURE.test(message);
}
