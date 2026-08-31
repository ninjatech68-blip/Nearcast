import type { IMessage } from '@kesha-antonov/react-native-chat';

import type { Message, MessageStatus } from './chat';

/**
 * Our message shape, in the library's terms.
 *
 * The chat UI is `@kesha-antonov/react-native-chat`, the maintained
 * continuation of Gifted Chat. It brings reactions, reply and swipe-to-reply,
 * a long-press menu, day separators, grouping and a scroll-to-bottom button —
 * the things people expect from a messenger and would notice missing.
 *
 * What it does NOT model, we keep on the message and draw ourselves:
 *
 *   receipts   it has three states (pending, sent, received); we have five.
 *   media      ours is an object path in a private bucket, resolved to a
 *              short-lived signed URL at render time. Its `image` field
 *              expects a URI, so a path there would simply fail to load.
 *
 * Nothing in this module touches the transport. `chat.ts` and
 * `remote-chat.ts` are unchanged: this is a view adapter, and keeping it pure
 * is what makes the mapping testable without a renderer.
 *
 * Pure: no React Native, no Supabase.
 */

/** The library keys bubbles by user id; ours is a side, not an account. */
export const ME = 'me';

export type NearcastChatMessage = IMessage & {
  /** the exact receipt state, for our own tick renderer */
  status?: MessageStatus;
  /** an object path in the private bucket, never a URL */
  mediaPath?: string;
  mediaThumbPath?: string;
  mediaKind?: 'image' | 'gif';
  mediaWidth?: number;
  mediaHeight?: number;
  /** the approximate place name that came with a location share */
  placeLabel?: string;
  /** so an optimistic bubble can be reconciled with the stored row */
  clientMessageId?: string;
};

/**
 * Five receipt states onto three.
 *
 * `delivered` and `read` both satisfy the library's `received`, so its
 * built-in ticks stay truthful at a coarser grain while our renderer draws
 * the exact state. `failed` is the mapping that matters: it must not set
 * `sent`, because a tick claiming a message was sent when it was not is the
 * one thing here that would mislead someone.
 */
function receipts(status: MessageStatus | undefined): Pick<IMessage, 'sent' | 'received' | 'pending'> {
  switch (status) {
    case 'pending':
      return { pending: true, sent: false, received: false };
    case 'sent':
      return { pending: false, sent: true, received: false };
    case 'delivered':
    case 'read':
      return { pending: false, sent: true, received: true };
    case 'failed':
      return { pending: false, sent: false, received: false };
    default:
      return { pending: false, sent: false, received: false };
  }
}

export function toChatMessage(message: Message, otherName: string): NearcastChatMessage {
  const mine = message.from === 'me';

  return {
    _id: message.id,
    text: message.text,
    createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
    user: {
      _id: mine ? ME : 'them',
      name: mine ? undefined : otherName,
    },
    ...(message.from === 'system' ? { system: true } : {}),
    ...receipts(message.status),
    status: message.status,
    ...(message.latitude !== undefined && message.longitude !== undefined
      ? { location: { latitude: message.latitude, longitude: message.longitude } }
      : {}),
    ...(message.placeLabel === undefined ? {} : { placeLabel: message.placeLabel }),
    ...(message.mediaPath === undefined ? {} : { mediaPath: message.mediaPath }),
    ...(message.mediaThumbPath === undefined ? {} : { mediaThumbPath: message.mediaThumbPath }),
    ...(message.mediaKind === undefined ? {} : { mediaKind: message.mediaKind }),
    ...(message.mediaWidth === undefined ? {} : { mediaWidth: message.mediaWidth }),
    ...(message.mediaHeight === undefined ? {} : { mediaHeight: message.mediaHeight }),
    ...(message.clientMessageId === undefined ? {} : { clientMessageId: message.clientMessageId }),
  };
}

/**
 * The list runs newest-first, which is what an inverted message list wants,
 * so the transport's chronological order is reversed once here rather than in
 * the screen.
 */
export function toChatMessages(
  messages: readonly Message[],
  otherName: string,
): NearcastChatMessage[] {
  return messages.map((message) => toChatMessage(message, otherName)).reverse();
}
