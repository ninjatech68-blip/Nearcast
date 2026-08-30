import { describe, expect, it } from 'vitest';

import { createEmptyDraft, type IntentDraft } from './draft';
import {
  DRAFT_STORAGE_KEY,
  clearDraft,
  loadDraft,
  saveDraft,
  type DraftStore,
} from './draft-storage';

const now = new Date('2026-08-30T12:00:00Z');

function memoryStore(initial: Record<string, string> = {}): DraftStore & {
  contents: Record<string, string>;
} {
  const contents = { ...initial };

  return {
    contents,
    getItem: (key) => contents[key] ?? null,
    setItem: (key, value) => {
      contents[key] = value;
    },
    removeItem: (key) => {
      delete contents[key];
    },
  };
}

function filledDraft(): IntentDraft {
  const draft = createEmptyDraft(now);

  return {
    ...draft,
    publicDraft: {
      ...draft.publicDraft,
      primitive: 'offer',
      statement: 'Spare desk on Sunday',
      responseAction: 'Ask for it',
    },
    privateDraft: { ...draft.privateDraft, exactAddress: '42 Private Lane' },
  };
}

describe('draft storage', () => {
  it('recovers a saved draft, private half included', () => {
    const store = memoryStore();
    saveDraft(store, filledDraft(), now);

    const recovered = loadDraft(store, now);

    expect(recovered.publicDraft.statement).toBe('Spare desk on Sunday');
    expect(recovered.privateDraft.exactAddress).toBe('42 Private Lane');
  });

  it('starts a fresh draft when nothing was stored', () => {
    expect(loadDraft(memoryStore(), now)).toEqual(createEmptyDraft(now));
  });

  it('discards unreadable stored data rather than half-restoring it', () => {
    const store = memoryStore({ [DRAFT_STORAGE_KEY]: 'not json' });

    expect(loadDraft(store, now)).toEqual(createEmptyDraft(now));
  });

  it('discards stored data that no longer matches the draft shape', () => {
    const store = memoryStore({
      [DRAFT_STORAGE_KEY]: JSON.stringify({ publicDraft: { statement: 'orphan' } }),
    });

    expect(loadDraft(store, now)).toEqual(createEmptyDraft(now));
  });

  it('keeps the in-memory draft when the device store refuses to write', () => {
    const store: DraftStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
      removeItem: () => undefined,
    };

    expect(() => saveDraft(store, filledDraft(), now)).not.toThrow();
    expect(saveDraft(store, filledDraft(), now).publicDraft.statement).toBe(
      'Spare desk on Sunday',
    );
  });

  it('survives a store that cannot be read at all', () => {
    const store: DraftStore = {
      getItem: () => {
        throw new Error('unavailable');
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };

    expect(loadDraft(store, now)).toEqual(createEmptyDraft(now));
  });

  it('clears the draft completely, leaving no private residue', () => {
    const store = memoryStore();
    saveDraft(store, filledDraft(), now);

    clearDraft(store);

    expect(store.contents[DRAFT_STORAGE_KEY]).toBeUndefined();
    expect(JSON.stringify(store.contents)).not.toContain('42 Private Lane');
    expect(loadDraft(store, now)).toEqual(createEmptyDraft(now));
  });

  it('stamps the save time so recovery can be reasoned about', () => {
    const later = new Date('2026-08-30T18:00:00Z');

    expect(saveDraft(memoryStore(), filledDraft(), later).updatedAt).toBe(
      later.toISOString(),
    );
  });
});
