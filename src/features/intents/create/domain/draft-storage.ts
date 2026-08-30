import {
  createEmptyDraft,
  intentDraftSchema,
  type IntentDraft,
} from '@/features/intents/create/domain/draft';

/**
 * Draft persistence rules.
 *
 * Drafts stay on the device: Mobile Screen Contracts require the composer's
 * draft to remain local and private, so nothing here talks to Supabase. The
 * store is injected rather than imported so the recovery rules can be tested
 * without a device, and so account deletion has one obvious place to clear.
 */

export const DRAFT_STORAGE_KEY = 'nearcast.intent-draft.v1';

export type DraftStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

/**
 * Recovers a saved draft, falling back to a fresh one.
 *
 * Unreadable or outdated stored data is discarded rather than repaired: a
 * half-parsed draft could silently drop the private half, and losing an
 * unfinished draft is a smaller harm than publishing one that is missing
 * fields the person believed were still set.
 */
export function loadDraft(store: DraftStore, now: Date): IntentDraft {
  let raw: string | null = null;

  try {
    raw = store.getItem(DRAFT_STORAGE_KEY);
  } catch {
    return createEmptyDraft(now);
  }

  if (raw === null) return createEmptyDraft(now);

  try {
    const parsed = intentDraftSchema.safeParse(JSON.parse(raw));

    return parsed.success ? parsed.data : createEmptyDraft(now);
  } catch {
    return createEmptyDraft(now);
  }
}

export function saveDraft(
  store: DraftStore,
  draft: IntentDraft,
  now: Date,
): IntentDraft {
  const stamped: IntentDraft = { ...draft, updatedAt: now.toISOString() };

  try {
    store.setItem(DRAFT_STORAGE_KEY, JSON.stringify(stamped));
  } catch {
    // A full or unavailable store must not lose the in-memory draft, so the
    // caller keeps editing and the next save retries.
  }

  return stamped;
}

/** Called on sign-out and on account deletion; must never throw. */
export function clearDraft(store: DraftStore): void {
  try {
    store.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Nothing to recover from: the draft is already unreachable.
  }
}
