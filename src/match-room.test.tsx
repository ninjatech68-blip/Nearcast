import { describe, expect, it, jest } from '@jest/globals';
import { render, userEvent, waitFor } from '@testing-library/react-native';

let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
}));

jest.mock('expo-symbols', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');

  return {
    SymbolView: ({ fallback }: { fallback?: React.ReactNode }) => <Text>{fallback}</Text>,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MatchRoomScreen = require('./app/match/[id]').default;

function renderRoom(next: Record<string, string> = {}) {
  mockParams = next;
  return render(<MatchRoomScreen />);
}

describe('match room content', () => {
  it('leads with the cast it belongs to and its status', async () => {
    const view = await renderRoom();

    expect(view.getByText('Two people for badminton tonight')).toBeTruthy();
    expect(view.getByText('Matched')).toBeTruthy();
  });

  it('names exactly what acceptance released and what did not', async () => {
    const view = await renderRoom();

    expect(view.getByText('Shared with you both')).toBeTruthy();
    expect(view.getByText('Indiranagar Sports Arena, Court 3')).toBeTruthy();
    expect(
      view.getByText('Anything not listed here stays private. Closing the cast ends this room.'),
    ).toBeTruthy();
  });

  it('reports delivery state only for your own messages', async () => {
    const view = await renderRoom();

    expect(view.getByText('Read')).toBeTruthy();
  });
});

describe('match room states', () => {
  it('shows a loading state', async () => {
    const view = await renderRoom({ state: 'loading' });

    expect(view.getByText('Opening your room…')).toBeTruthy();
  });

  it('shows an empty state that does not invent activity', async () => {
    const view = await renderRoom({ state: 'empty' });

    expect(view.getByText('No messages yet')).toBeTruthy();
  });

  it('shows an error state with a retry', async () => {
    const view = await renderRoom({ state: 'error' });

    expect(view.getByText('We could not open this room')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('shows a restricted state without revealing enforcement detail', async () => {
    const view = await renderRoom({ state: 'restricted' });

    expect(view.getByText('This room is unavailable')).toBeTruthy();
  });
});

describe('match room sending', () => {
  it('keeps send unavailable until there is something to send', async () => {
    const view = await renderRoom();

    expect(view.getByLabelText('Send message')).toBeDisabled();
  });

  it('sends a typed message', async () => {
    const user = userEvent.setup();
    const view = await renderRoom();

    await user.type(view.getByLabelText('Message'), 'Running five minutes late');
    await user.press(view.getByLabelText('Send message'));

    expect(view.getByText('Running five minutes late')).toBeTruthy();
    await waitFor(() => expect(view.getByText('Sent')).toBeTruthy());
  });

  it('does not double-send on a duplicate tap', async () => {
    const user = userEvent.setup();
    const view = await renderRoom();

    await user.type(view.getByLabelText('Message'), 'On my way');
    const send = view.getByLabelText('Send message');
    await user.press(send);
    await user.press(send);

    expect(view.getAllByText('On my way')).toHaveLength(1);
  });

  it('queues rather than drops a message when offline', async () => {
    const user = userEvent.setup();
    const view = await renderRoom({ online: 'false' });

    await user.type(view.getByLabelText('Message'), 'Heading over now');
    await user.press(view.getByLabelText('Send message'));

    expect(view.getByText('Queued — will send when you are online')).toBeTruthy();
    expect(
      view.getByText('You are offline. Messages will send when you are back.'),
    ).toBeTruthy();
  });
});
