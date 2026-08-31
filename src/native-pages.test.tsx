import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    push: (...args: unknown[]) => mockPush(...args),
  },
  useLocalSearchParams: () => ({ id: 'intent-1', firstName: 'Dev' }),
  Redirect: ({ href }: { href: string }) => `Redirect:${href}`,
}));

jest.mock('expo-symbols', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');

  return {
    SymbolView: ({ fallback }: { fallback?: React.ReactNode }) => <Text>{fallback}</Text>,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HomeScreen = require('./app/(tabs)/index').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RequestSheetScreen = require('./app/request/[id]').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ActivityScreen = require('./app/(tabs)/activity').default;
jest.mock('@/infrastructure/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'viewer' } } }) },
  },
}));

jest.mock('@/features/messages/data/messages-repository', () => ({
  fetchConversationSummaries: async () => [],
}));

jest.mock('@/features/responses/data/responses-repository', () => ({
  submitResponse: async () => ({ responseId: 'response-1', status: 'pending' }),
}));

jest.mock('@/features/responses/inbox/data/inbox-repository', () => ({
  fetchInbox: async () => [],
  acceptResponse: async () => ({ matchId: 'match-1' }),
  declineResponse: async () => ({ status: 'declined' }),
}));

jest.mock('@/features/feed/data/feed-repository', () => ({
  fetchHomeFeed: async () => [],
  hideDelivery: async () => undefined,
  markNotRelevant: async () => undefined,
  setSaved: async () => undefined,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MessagesScreen = require('./app/(tabs)/messages').default;

describe('native page set', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
  });

  it('renders the For You feed shell', async () => {
    // The feed is now data-backed; its behaviour is covered in
    // home-feed.test.tsx. This keeps the shell assertion.
    const view = await render(<HomeScreen />);

    expect(await view.findByText(/Nothing right now/)).toBeTruthy();
  });

  // The intent detail screen is now data-backed; its behaviour is covered in
  // intent-detail.test.tsx. The two assertions that used to live here checked
  // that it rendered a fixture and pushed a hardcoded slug, which is exactly
  // the bug: they passed while no card in the feed could open its own intent.
  //
  // The broadcaster profile screen was removed rather than rewritten. It showed
  // an invented person, and a real one needs the contextual reliability history
  // that Plan 05 defines, so there is nothing honest to render yet.

  it('uses a bottom sheet style response screen with disclosure', async () => {
    const view = await render(<RequestSheetScreen />);

    // The sheet is now data-backed; its behaviour is covered in
    // response-sheet.test.tsx. This keeps the shell assertion: it is reachable
    // and it states the disclosure before anything is sent.
    expect(view.getByLabelText('Your note')).toBeTruthy();
    expect(view.getByLabelText('What they will see')).toBeTruthy();
  });

  it('shows minimal activity and messages tabs', async () => {
    // The inbox is now data-backed; its behaviour is covered in
    // inbox-screen.test.tsx. This keeps the shell assertion.
    const activity = await render(<ActivityScreen />);
    expect(await activity.findByText(/No responses yet/)).toBeTruthy();

    const messages = await render(<MessagesScreen />);
    expect(messages.getByText('Messages')).toBeTruthy();
    expect(
      await messages.findByText('Messages appear after acceptance'),
    ).toBeTruthy();
  });
});
