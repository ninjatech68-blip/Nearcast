/**
 * Match room lifetime rules.
 *
 * A coordination room is temporary. It stops accepting messages when it is
 * explicitly closed or when its deadline passes, whichever happens first.
 * Expiry is evaluated against the clock rather than against `closedAt` so a
 * lagging sweep never leaves a lapsed room writable. PostgreSQL enforces the
 * same rule in `messages_insert_parties`; this module exists so the UI can
 * reach the same conclusion without a round trip.
 *
 * The transcript stays readable after close. Only sending stops.
 */

export const ROOM_STATES = ['open', 'closing_soon', 'closed'] as const;

export type RoomState = (typeof ROOM_STATES)[number];

export type RoomLifetime = {
  expiresAt: Date;
  closedAt: Date | null;
};

/** A room is flagged as closing while this much time or less remains. */
export const CLOSING_SOON_WINDOW_MS = 60 * 60 * 1000;

export function millisecondsUntilClose(room: RoomLifetime, now: Date): number {
  return Math.max(0, room.expiresAt.getTime() - now.getTime());
}

export function deriveRoomState(room: RoomLifetime, now: Date): RoomState {
  if (room.closedAt !== null) return 'closed';
  if (room.expiresAt.getTime() <= now.getTime()) return 'closed';
  if (millisecondsUntilClose(room, now) <= CLOSING_SOON_WINDOW_MS) {
    return 'closing_soon';
  }

  return 'open';
}

export function canSendMessage(room: RoomLifetime, now: Date): boolean {
  return deriveRoomState(room, now) !== 'closed';
}

/**
 * Factual, non-alarming deadline copy. Never claims a room is open once the
 * deadline has passed, and never invents a precision the clock does not have.
 */
export function describeRoomDeadline(room: RoomLifetime, now: Date): string {
  if (deriveRoomState(room, now) === 'closed') return 'This room has closed';

  const remaining = millisecondsUntilClose(room, now);
  const minutes = Math.ceil(remaining / 60_000);

  if (minutes <= 1) return 'This room closes in under a minute';
  if (minutes < 60) return `This room closes in ${minutes} minutes`;

  const hours = Math.round(remaining / 3_600_000);
  if (hours < 24) {
    return `This room closes in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }

  const days = Math.round(remaining / 86_400_000);
  return `This room closes in ${days} ${days === 1 ? 'day' : 'days'}`;
}
