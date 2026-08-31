export const MESSAGE_STATUSES = ['sending', 'queued', 'failed', 'sent'] as const;

export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

/**
 * Temporary-room messages are short coordination notes, not correspondence.
 * The cap is enforced again in PostgreSQL; this bound exists so the composer
 * can refuse a send before it leaves the device.
 */
export const MAX_MESSAGE_LENGTH = 2000;

export type MatchMessage = {
  authorId: string;
  body: string;
  id: string;
  readByRecipient: boolean;
  sentAt: string;
  status: MessageStatus;
};

/**
 * `inFlight` is the duplicate-tap guard: a second press while the first send
 * is unresolved must not enqueue a second copy of the same message.
 */
export function canSend({ draft, inFlight }: { draft: string; inFlight: boolean }) {
  if (inFlight) return false;

  const trimmed = draft.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH;
}

/**
 * Losing the network queues a message. It never silently drops one, and it
 * never reports a send that did not happen.
 */
export function statusForSend(online: boolean): MessageStatus {
  return online ? 'sending' : 'queued';
}

export function groupConsecutive(messages: readonly MatchMessage[]): MatchMessage[][] {
  const groups: MatchMessage[][] = [];

  for (const message of messages) {
    const current = groups[groups.length - 1];

    if (current && current[0].authorId === message.authorId) {
      current.push(message);
      continue;
    }

    groups.push([message]);
  }

  return groups;
}

/**
 * Read state is reported only for your own messages. Surfacing whether you
 * have read theirs would be a presence signal, which MAY-050 defers.
 */
export function readStateLabel(message: MatchMessage, viewerId: string): string | null {
  if (message.authorId !== viewerId) return null;

  switch (message.status) {
    case 'sending':
      return 'Sending';
    case 'queued':
      return 'Queued — will send when you are online';
    case 'failed':
      return 'Not sent';
    case 'sent':
      return message.readByRecipient ? 'Read' : 'Sent';
  }
}
