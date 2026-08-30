import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

import type { ConversationSummary } from '@/features/messages/data/messages-repository';

const mockPush = jest.fn();
let mockFetchResult: () => Promise<ConversationSummary[]>;
let mockCurrentUser: { id: string } | undefined;

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('@/infrastructure/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: mockCurrentUser } }) },
  },
}));

jest.mock('@/features/messages/data/messages-repository', () => ({
  fetchConversationSummaries: () => mockFetchResult(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MessagesScreen = require('./app/(tabs)/messages').default;

const inHours = (hours: number) => new Date(Date.now() + hours * 3_600_000);

const room = (overrides: Partial<ConversationSummary> = {}): ConversationSummary => ({
  conversationId: 'conversation-1',
  intentStatement: 'Badminton tonight',
  counterpartName: 'Dev Mehta',
  room: { expiresAt: inHours(8), closedAt: null },
  ...overrides,
});

describe('Messages list', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockCurrentUser = { id: 'viewer' };
    mockFetchResult = async () => [];
  });

  it('lists a room with its counterpart and deadline, and opens it', async () => {
    const user = userEvent.setup();
    mockFetchResult = async () => [room()];

    const view = await render(<MessagesScreen />);

    expect(await view.findByText('Badminton tonight')).toBeTruthy();
    expect(view.getByText('Dev Mehta')).toBeTruthy();
    expect(view.getByText('This room closes in 8 hours')).toBeTruthy();

    await user.press(
      view.getByLabelText('Badminton tonight, with Dev Mehta'),
    );

    expect(mockPush).toHaveBeenCalledWith('/room/conversation-1');
  });

  it('marks a lapsed room as closed rather than inviting a reply', async () => {
    mockFetchResult = async () => [room({ room: { expiresAt: inHours(-2), closedAt: null } })];

    const view = await render(<MessagesScreen />);

    expect(await view.findByText('This room has closed')).toBeTruthy();
  });

  it('explains the empty state without inventing a room', async () => {
    const view = await render(<MessagesScreen />);

    expect(await view.findByText('Messages appear after acceptance')).toBeTruthy();
  });

  it('offers a retry when the rooms cannot be loaded', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    mockFetchResult = async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('offline');
      return [room()];
    };

    const view = await render(<MessagesScreen />);

    expect(await view.findByText('We could not load your rooms')).toBeTruthy();

    await user.press(view.getByLabelText('Try loading your rooms again'));

    expect(await view.findByText('Badminton tonight')).toBeTruthy();
  });

  it('does not list rooms to a signed-out viewer', async () => {
    mockCurrentUser = undefined;
    mockFetchResult = async () => [room()];

    const view = await render(<MessagesScreen />);

    expect(await view.findByText('Sign in to see your rooms')).toBeTruthy();
    expect(view.queryByText('Badminton tonight')).toBeNull();
  });
});
