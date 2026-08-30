import { describe, expect, it } from 'vitest';

import {
  CLOSING_SOON_WINDOW_MS,
  canSendMessage,
  deriveRoomState,
  describeRoomDeadline,
  millisecondsUntilClose,
} from './room';

const now = new Date('2026-08-30T12:00:00Z');
const inHours = (hours: number) =>
  new Date(now.getTime() + hours * 3_600_000);

describe('match room lifetime', () => {
  it('is open while the deadline is comfortably ahead', () => {
    const room = { expiresAt: inHours(8), closedAt: null };

    expect(deriveRoomState(room, now)).toBe('open');
    expect(canSendMessage(room, now)).toBe(true);
  });

  it('warns while the room is inside the closing window', () => {
    const room = {
      expiresAt: new Date(now.getTime() + CLOSING_SOON_WINDOW_MS),
      closedAt: null,
    };

    expect(deriveRoomState(room, now)).toBe('closing_soon');
    expect(canSendMessage(room, now)).toBe(true);
  });

  it('closes an expired room even when the sweep has not run yet', () => {
    const room = { expiresAt: inHours(-1), closedAt: null };

    expect(deriveRoomState(room, now)).toBe('closed');
    expect(canSendMessage(room, now)).toBe(false);
  });

  it('treats the deadline itself as closed', () => {
    const room = { expiresAt: now, closedAt: null };

    expect(deriveRoomState(room, now)).toBe('closed');
    expect(canSendMessage(room, now)).toBe(false);
  });

  it('honours an explicit close ahead of the deadline', () => {
    const room = { expiresAt: inHours(8), closedAt: inHours(-2) };

    expect(deriveRoomState(room, now)).toBe('closed');
    expect(canSendMessage(room, now)).toBe(false);
  });

  it('never reports negative time remaining', () => {
    expect(
      millisecondsUntilClose({ expiresAt: inHours(-5), closedAt: null }, now),
    ).toBe(0);
  });

  it('describes the deadline factually and never claims an expired room is open', () => {
    expect(
      describeRoomDeadline({ expiresAt: inHours(30), closedAt: null }, now),
    ).toBe('This room closes in 1 day');
    expect(
      describeRoomDeadline({ expiresAt: inHours(3), closedAt: null }, now),
    ).toBe('This room closes in 3 hours');
    expect(
      describeRoomDeadline({ expiresAt: inHours(-1), closedAt: null }, now),
    ).toBe('This room has closed');
  });
});
