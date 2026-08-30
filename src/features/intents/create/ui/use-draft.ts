import { useCallback, useState } from 'react';

import { deviceDraftStore } from '@/features/intents/create/data/device-draft-store';
import {
  createEmptyDraft,
  type IntentDraft,
  type PrivateDraft,
  type PublicDraft,
} from '@/features/intents/create/domain/draft';
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type DraftStore,
} from '@/features/intents/create/domain/draft-storage';

/**
 * The composer's draft, recovered on first render and written back on edit.
 *
 * Recovery runs in the state initialiser rather than an effect because the
 * device store is synchronous. That means the composer never paints an empty
 * field over a saved draft, and never saves that empty state back over it.
 */
export function useDraft(store: DraftStore = deviceDraftStore) {
  const [draft, setDraft] = useState<IntentDraft>(() => loadDraft(store, new Date()));

  const update = useCallback(
    (change: { publicDraft?: Partial<PublicDraft>; privateDraft?: Partial<PrivateDraft> }) => {
      setDraft((current) => {
        const next: IntentDraft = {
          ...current,
          publicDraft: { ...current.publicDraft, ...change.publicDraft },
          privateDraft: { ...current.privateDraft, ...change.privateDraft },
        };

        return saveDraft(store, next, new Date());
      });
    },
    [store],
  );

  const discard = useCallback(() => {
    clearDraft(store);
    setDraft(createEmptyDraft(new Date()));
  }, [store]);

  return { draft, update, discard };
}
