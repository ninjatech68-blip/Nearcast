import { describe, expect, it } from 'vitest';

import {
  SYSTEM_AUTHOR_ID,
  messageBodySchema,
  toRoomChatMessage,
  toRoomChatMessages,
  type RoomMessageRecord,
  type RoomParticipant,
} from './message';

const participants: RoomParticipant[] = [
  { id: 'broadcaster', displayName: 'Asha Rao', avatarUrl: 'https://cdn/a.png' },
  { id: 'participant', displayName: 'Dev Mehta', avatarUrl: null },
];

const record = (overrides: Partial<RoomMessageRecord> = {}): RoomMessageRecord => ({
  id: 'message-1',
  senderId: 'broadcaster',
  body: 'Shall we meet at seven?',
  isSystem: false,
  createdAt: new Date('2026-08-30T12:00:00Z'),
  replyToId: null,
  delivery: 'sent',
  ...overrides,
});

/** Every Gifted Chat field the product rules exclude. */
const FORBIDDEN_FIELDS = [
  'image',
  'video',
  'audio',
  'location',
  'quickReplies',
  'received',
] as const;

describe('room message mapping', () => {
  it('carries the author identity of a match party', () => {
    const mapped = toRoomChatMessage(record(), participants);

    expect(mapped).toMatchObject({
      _id: 'message-1',
      text: 'Shall we meet at seven?',
      user: { _id: 'broadcaster', name: 'Asha Rao', avatar: 'https://cdn/a.png' },
    });
  });

  it('omits the avatar key entirely when a party has no avatar', () => {
    const mapped = toRoomChatMessage(record({ senderId: 'participant' }), participants);

    expect(mapped.user).toEqual({ _id: 'participant', name: 'Dev Mehta' });
    expect('avatar' in mapped.user).toBe(false);
  });

  it('never emits media, location, quick replies or read receipts', () => {
    const mapped = toRoomChatMessage(record(), participants);

    for (const field of FORBIDDEN_FIELDS) {
      expect(field in mapped).toBe(false);
    }
  });

  it('reports delivery factually and never claims a message was read', () => {
    expect(toRoomChatMessage(record({ delivery: 'pending' }), participants)).toMatchObject({
      pending: true,
      sent: false,
    });
    expect(toRoomChatMessage(record({ delivery: 'sent' }), participants)).toMatchObject({
      pending: false,
      sent: true,
    });
  });

  it('renders a system row without borrowing a party identity', () => {
    const mapped = toRoomChatMessage(
      record({ senderId: null, isSystem: true, body: 'This coordination room has closed.' }),
      participants,
    );

    expect(mapped.system).toBe(true);
    expect(mapped.user).toEqual({ _id: SYSTEM_AUTHOR_ID });
    expect('sent' in mapped).toBe(false);
    expect('pending' in mapped).toBe(false);
  });

  it('resolves a reply to its target within the same room', () => {
    const target = record({ id: 'message-1' });
    const reply = record({
      id: 'message-2',
      senderId: 'participant',
      body: 'Seven works.',
      replyToId: 'message-1',
    });

    const mapped = toRoomChatMessage(reply, participants, [target, reply]);

    expect(mapped.replyMessage).toEqual({
      _id: 'message-1',
      text: 'Shall we meet at seven?',
      user: { _id: 'broadcaster', name: 'Asha Rao', avatar: 'https://cdn/a.png' },
    });
  });

  it('drops a dangling reply rather than inventing a quoted message', () => {
    const reply = record({ id: 'message-2', replyToId: 'deleted-message' });

    expect(toRoomChatMessage(reply, participants, [reply]).replyMessage).toBeUndefined();
  });

  it('orders newest first for the inverted list', () => {
    const older = record({ id: 'older', createdAt: new Date('2026-08-30T10:00:00Z') });
    const newer = record({ id: 'newer', createdAt: new Date('2026-08-30T14:00:00Z') });

    expect(toRoomChatMessages([older, newer], participants).map((m) => m._id)).toEqual([
      'newer',
      'older',
    ]);
  });

  it('mirrors the database body constraint', () => {
    expect(messageBodySchema.parse('  Seven works.  ')).toBe('Seven works.');
    expect(messageBodySchema.safeParse('   ').success).toBe(false);
    expect(messageBodySchema.safeParse('x'.repeat(2001)).success).toBe(false);
    expect(messageBodySchema.safeParse('x'.repeat(2000)).success).toBe(true);
  });
});
