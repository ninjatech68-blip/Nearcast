import { describe, expect, it } from 'vitest';

import {
  isEmptyDraft,
  isNetworkFailure,
  parseStoredDraft,
  serializeDraft,
  type LocalDraft,
} from './draft';

const draft: LocalDraft = {
  primitive: 'request',
  statement: 'Need a spare projector for a workshop on Saturday.',
  reach: 'adjacent_network',
  publicLinkEnabled: true,
  showFirstName: false,
  updatedAt: '2026-08-26T09:00:00.000Z',
};

describe('local draft', () => {
  it('survives a round trip through storage', () => {
    expect(parseStoredDraft(serializeDraft(draft))).toEqual(draft);
  });

  it('treats nothing stored as no draft', () => {
    expect(parseStoredDraft(null)).toBeNull();
    expect(parseStoredDraft(undefined)).toBeNull();
    expect(parseStoredDraft('')).toBeNull();
  });

  it('treats an unreadable row as no draft rather than partial state', () => {
    expect(parseStoredDraft('{ not json')).toBeNull();
    expect(parseStoredDraft('{"statement":"half a draft"}')).toBeNull();
    expect(
      parseStoredDraft(serializeDraft({ ...draft, primitive: 'rumour' as never })),
    ).toBeNull();
  });

  it('recognises a draft with nothing in it', () => {
    expect(isEmptyDraft(draft)).toBe(false);
    expect(isEmptyDraft({ ...draft, statement: '   ' })).toBe(true);
  });
});

describe('network failure detection', () => {
  it('recognises the shapes a failed request arrives in', () => {
    expect(isNetworkFailure('TypeError: Network request failed')).toBe(true);
    expect(isNetworkFailure('Failed to fetch')).toBe(true);
    expect(isNetworkFailure('NetworkError when attempting to fetch resource')).toBe(true);
  });

  it('does not mistake a refusal by the server for being offline', () => {
    expect(isNetworkFailure('stale_state')).toBe(false);
    expect(isNetworkFailure('new row violates row-level security policy')).toBe(false);
    expect(isNetworkFailure(null)).toBe(false);
    expect(isNetworkFailure(undefined)).toBe(false);
  });
});
