import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// A tiny stand-in for the native database: enough to prove the module's SQL
// round trip, without a native module the test environment cannot provide.
type Row = { payload: string } | null;

function fakeDatabase() {
  let stored: Row = null;
  return {
    execSync: jest.fn(),
    getFirstSync: jest.fn(() => stored),
    runSync: jest.fn((sql: string, ...args: unknown[]) => {
      if (sql.trim().startsWith('delete')) {
        stored = null;
        return;
      }
      stored = { payload: String(args[1]) };
    }),
    _peek: () => stored,
  };
}

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => {
    throw new Error('no native database in tests');
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const store = require('@/features/intents/data/draft-store');

const draft = {
  primitive: 'offer' as const,
  statement: 'Spare projector available this weekend',
  reach: 'nearby_relevant' as const,
  publicLinkEnabled: false,
  showFirstName: true,
  updatedAt: '2026-08-26T09:00:00.000Z',
};

describe('local draft store', () => {
  beforeEach(() => {
    store._setDatabaseForTests(null);
  });

  it('returns a saved draft unchanged', () => {
    const db = fakeDatabase();
    store._setDatabaseForTests(db);

    store.saveDraft(draft);

    expect(store.loadDraft()).toEqual(draft);
  });

  it('replaces the previous draft rather than accumulating rows', () => {
    const db = fakeDatabase();
    store._setDatabaseForTests(db);

    store.saveDraft(draft);
    store.saveDraft({ ...draft, statement: 'Second thoughts' });

    expect(store.loadDraft()?.statement).toBe('Second thoughts');
    expect(db.runSync).toHaveBeenCalledTimes(2);
  });

  it('forgets the draft when it is cleared', () => {
    const db = fakeDatabase();
    store._setDatabaseForTests(db);

    store.saveDraft(draft);
    store.clearDraft();

    expect(store.loadDraft()).toBeNull();
  });

  it('reports no draft when the row is unreadable', () => {
    const db = fakeDatabase();
    db.getFirstSync.mockReturnValue({ payload: 'not json at all' });
    store._setDatabaseForTests(db);

    expect(store.loadDraft()).toBeNull();
  });

  it('never throws when the database itself is unavailable', () => {
    store._setDatabaseForTests(null);

    expect(() => store.saveDraft(draft)).not.toThrow();
    expect(store.loadDraft()).toBeNull();
    expect(() => store.clearDraft()).not.toThrow();
  });
});
