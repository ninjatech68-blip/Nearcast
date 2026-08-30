import { describe, expect, it } from 'vitest';

import { createEmptyDraft, type IntentDraft } from './draft';
import { buildPublishRequest } from './publish-request';

const now = new Date('2026-08-30T12:00:00Z');
const KEY = '70000000-0000-0000-0000-000000000001';

function draft(): IntentDraft {
  const empty = createEmptyDraft(now);

  return {
    ...empty,
    publicDraft: {
      ...empty.publicDraft,
      primitive: 'request',
      statement: '  Need two helpers  ',
      responseAction: 'Offer help',
    },
    privateDraft: { ...empty.privateDraft, exactAddress: '42 Private Lane' },
  };
}

describe('publish request', () => {
  it('builds a valid request from a complete draft', () => {
    const result = buildPublishRequest(draft(), 'adjacent_network', KEY);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.request.statement).toBe('Need two helpers');
    expect(result.request.reach).toBe('adjacent_network');
    expect(result.request.requestKey).toBe(KEY);
  });

  it('carries private details as their own fields, not folded into public ones', () => {
    const result = buildPublishRequest(draft(), 'origin_only', KEY);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.request.exactAddress).toBe('42 Private Lane');
    expect(result.request.statement).not.toContain('Private Lane');
    expect(result.request.approximatePlace).toBeNull();
  });

  it('refuses a draft with no primitive chosen', () => {
    const incomplete = draft();
    incomplete.publicDraft.primitive = null;

    expect(buildPublishRequest(incomplete, 'origin_only', KEY).ok).toBe(false);
  });

  it('refuses a statement beyond the 500 character limit', () => {
    const long = draft();
    long.publicDraft.statement = 'x'.repeat(501);

    expect(buildPublishRequest(long, 'origin_only', KEY).ok).toBe(false);
  });

  it('refuses a request without a usable idempotency key', () => {
    expect(buildPublishRequest(draft(), 'origin_only', 'not-a-uuid').ok).toBe(false);
  });

  it('accepts any key the uuid column would store, not only RFC v4', () => {
    expect(buildPublishRequest(draft(), 'origin_only', KEY).ok).toBe(true);
    expect(
      buildPublishRequest(
        draft(),
        'origin_only',
        '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      ).ok,
    ).toBe(true);
  });

  it('reports every problem at once rather than only the first', () => {
    const empty = createEmptyDraft(now);
    const result = buildPublishRequest(empty, 'origin_only', KEY);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.problems.length).toBeGreaterThan(1);
  });
});
