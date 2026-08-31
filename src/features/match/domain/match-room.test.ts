import { describe, expect, it } from 'vitest';

import {
  MAX_MESSAGE_LENGTH,
  canSend,
  groupConsecutive,
  readStateLabel,
  statusForSend,
} from './match-room';

const base = {
  authorId: 'me',
  body: 'Hello',
  id: 'm1',
  readByRecipient: false,
  sentAt: '2026-08-31T10:00:00.000Z',
  status: 'sent' as const,
};

describe('canSend', () => {
  it('rejects an empty draft', () => {
    expect(canSend({ draft: '', inFlight: false })).toBe(false);
    expect(canSend({ draft: '   ', inFlight: false })).toBe(false);
  });

  it('accepts a real draft', () => {
    expect(canSend({ draft: 'On my way', inFlight: false })).toBe(true);
  });

  it('refuses a duplicate send while one is already in flight', () => {
    expect(canSend({ draft: 'On my way', inFlight: true })).toBe(false);
  });

  it('refuses a draft longer than the limit', () => {
    expect(canSend({ draft: 'x'.repeat(MAX_MESSAGE_LENGTH + 1), inFlight: false })).toBe(false);
    expect(canSend({ draft: 'x'.repeat(MAX_MESSAGE_LENGTH), inFlight: false })).toBe(true);
  });
});

describe('statusForSend', () => {
  it('sends when online', () => {
    expect(statusForSend(true)).toBe('sending');
  });

  it('queues when offline rather than failing', () => {
    expect(statusForSend(false)).toBe('queued');
  });
});

describe('groupConsecutive', () => {
  it('groups runs by author', () => {
    const groups = groupConsecutive([
      { ...base, id: 'a', authorId: 'me' },
      { ...base, id: 'b', authorId: 'me' },
      { ...base, id: 'c', authorId: 'them' },
      { ...base, id: 'd', authorId: 'me' },
    ]);

    expect(groups.map((group) => group.length)).toEqual([2, 1, 1]);
    expect(groups[0][0].authorId).toBe('me');
    expect(groups[1][0].authorId).toBe('them');
  });

  it('returns nothing for an empty room', () => {
    expect(groupConsecutive([])).toEqual([]);
  });
});

describe('readStateLabel', () => {
  it('never reports read state for the other person', () => {
    expect(readStateLabel({ ...base, authorId: 'them', readByRecipient: true }, 'me')).toBeNull();
  });

  it('reports delivery honestly for your own message', () => {
    expect(readStateLabel({ ...base, status: 'sending' }, 'me')).toBe('Sending');
    expect(readStateLabel({ ...base, status: 'queued' }, 'me')).toBe('Queued — will send when you are online');
    expect(readStateLabel({ ...base, status: 'failed' }, 'me')).toBe('Not sent');
    expect(readStateLabel({ ...base, status: 'sent', readByRecipient: false }, 'me')).toBe('Sent');
    expect(readStateLabel({ ...base, status: 'sent', readByRecipient: true }, 'me')).toBe('Read');
  });
});
