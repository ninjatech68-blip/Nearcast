import { z } from 'zod';

/**
 * Match room message mapping.
 *
 * The room renders through Gifted Chat, whose `IMessage` shape carries optional
 * fields for images, video, audio, location, quick replies and read receipts.
 * Plan 04 Task 4 excludes media, voice and live location, and AGENTS.md forbids
 * fabricating confirmations, so this module builds its output from a whitelist:
 * a field that has no column behind it cannot be produced here at all.
 *
 * `sent` and `pending` are kept because they are factual — they report whether
 * PostgreSQL has the row yet. `received` is deliberately absent: nothing records
 * whether the other party has read a message, so rendering a read tick would be
 * inventing an activity signal.
 *
 * This module stays free of React Native and Supabase imports so the rules can
 * be tested on their own.
 */

/** Author id used for `is_system` rows, which have no profile behind them. */
export const SYSTEM_AUTHOR_ID = 'system';

/** Mirrors the `char_length(btrim(body)) between 1 and 2000` database check. */
export const messageBodySchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, 'Write a message before sending')
      .max(2000, 'Messages are limited to 2000 characters'),
  );

export type RoomParticipant = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type MessageDelivery = 'pending' | 'sent';

export type RoomMessageRecord = {
  id: string;
  senderId: string | null;
  body: string;
  isSystem: boolean;
  createdAt: Date;
  replyToId: string | null;
  delivery: MessageDelivery;
};

export type RoomChatAuthor = {
  _id: string;
  name?: string;
  avatar?: string;
};

/**
 * Structurally assignable to Gifted Chat's `IMessage`, minus every field the
 * product rules exclude. The UI layer asserts the assignability.
 */
export type RoomChatMessage = {
  _id: string;
  text: string;
  createdAt: Date;
  user: RoomChatAuthor;
  system?: boolean;
  pending?: boolean;
  sent?: boolean;
  replyMessage?: {
    _id: string;
    text: string;
    user: RoomChatAuthor;
  };
};

function toAuthor(
  senderId: string | null,
  participants: readonly RoomParticipant[],
): RoomChatAuthor {
  if (senderId === null) return { _id: SYSTEM_AUTHOR_ID };

  const participant = participants.find((entry) => entry.id === senderId);
  if (participant === undefined) return { _id: senderId };

  return {
    _id: participant.id,
    name: participant.displayName,
    ...(participant.avatarUrl === null
      ? {}
      : { avatar: participant.avatarUrl }),
  };
}

export function toRoomChatMessage(
  record: RoomMessageRecord,
  participants: readonly RoomParticipant[],
  allRecords: readonly RoomMessageRecord[] = [],
): RoomChatMessage {
  const replyTarget =
    record.replyToId === null
      ? undefined
      : allRecords.find((entry) => entry.id === record.replyToId);

  return {
    _id: record.id,
    text: record.body,
    createdAt: record.createdAt,
    user: toAuthor(record.senderId, participants),
    ...(record.isSystem ? { system: true } : {}),
    ...(record.isSystem
      ? {}
      : {
          pending: record.delivery === 'pending',
          sent: record.delivery === 'sent',
        }),
    ...(replyTarget === undefined
      ? {}
      : {
          replyMessage: {
            _id: replyTarget.id,
            text: replyTarget.body,
            user: toAuthor(replyTarget.senderId, participants),
          },
        }),
  };
}

/** Gifted Chat renders inverted, so the newest message comes first. */
export function toRoomChatMessages(
  records: readonly RoomMessageRecord[],
  participants: readonly RoomParticipant[],
): RoomChatMessage[] {
  return [...records]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .map((record) => toRoomChatMessage(record, participants, records));
}
