import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, userEvent } from '@testing-library/react-native';

import { MatchRoom } from '@/features/messages/ui/match-room';
import type {
  RoomMessageRecord,
  RoomParticipant,
} from '@/features/messages/domain/message';

// Gifted Chat mounts its own SafeAreaProvider, which renders nothing until a
// layout pass supplies metrics. The library's own mock supplies them upfront.
jest.mock('react-native-safe-area-context', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-safe-area-context/jest/mock').default,
);

const now = new Date('2026-08-30T12:00:00Z');
const inHours = (hours: number) => new Date(now.getTime() + hours * 3_600_000);

const participants: RoomParticipant[] = [
  { id: 'viewer', displayName: 'Asha Rao', avatarUrl: null },
  { id: 'other', displayName: 'Dev Mehta', avatarUrl: null },
];

const messages: RoomMessageRecord[] = [
  {
    id: 'message-1',
    senderId: 'other',
    body: 'Shall we meet at seven?',
    isSystem: false,
    createdAt: inHours(-1),
    replyToId: null,
    delivery: 'sent',
  },
];

async function renderRoom(overrides: Partial<React.ComponentProps<typeof MatchRoom>> = {}) {
  const onSend = jest.fn();

  const view = await render(
    <MatchRoom
      viewerId="viewer"
      participants={participants}
      messages={messages}
      room={{ expiresAt: inHours(8), closedAt: null }}
      onSend={onSend}
      now={now}
      {...overrides}
    />,
  );

  // Gifted Chat keeps its tree hidden until a layout pass reports a height, and
  // layout events do not fire under the test renderer.
  fireEvent(view.getByTestId('GC_WRAPPER'), 'layout', {
    nativeEvent: { layout: { width: 320, height: 640, x: 0, y: 0 } },
  });

  return { view, onSend };
}

describe('MatchRoom', () => {
  it('shows the transcript and the room deadline while open', async () => {
    const { view } = await renderRoom();

    expect(await view.findByText('Shall we meet at seven?')).toBeTruthy();
    expect(await view.findByText('This room closes in 8 hours')).toBeTruthy();
  });

  it('accepts a message while the room is open', async () => {
    const user = userEvent.setup();
    const { view, onSend } = await renderRoom();

    await user.type(await view.findByLabelText('Message'), 'Seven works.');
    await user.press(await view.findByLabelText('Send message'));

    expect(onSend).toHaveBeenCalledWith('Seven works.', null);
  });

  it('replaces the composer with a read-only notice once the deadline passes', async () => {
    const { view } = await renderRoom({
      room: { expiresAt: inHours(-1), closedAt: null },
    });

    expect(await view.findByText('This room has closed')).toBeTruthy();
    expect(view.queryByLabelText('Send message')).toBeNull();
    expect(view.getByText('Shall we meet at seven?')).toBeTruthy();
  });

  it('closes the room when it was ended early, before its deadline', async () => {
    const { view } = await renderRoom({
      room: { expiresAt: inHours(8), closedAt: inHours(-2) },
    });

    expect(await view.findByText('This room has closed')).toBeTruthy();
    expect(view.queryByLabelText('Send message')).toBeNull();
  });

  it('renders a system row without attributing it to a party', async () => {
    const { view } = await renderRoom({
      messages: [
        ...messages,
        {
          id: 'message-2',
          senderId: null,
          body: 'This coordination room has closed.',
          isSystem: true,
          createdAt: inHours(-0.5),
          replyToId: null,
          delivery: 'sent',
        },
      ],
    });

    expect(await view.findByText('This coordination room has closed.')).toBeTruthy();
  });
});
