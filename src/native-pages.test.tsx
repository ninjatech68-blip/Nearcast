import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

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
const IntentDetailScreen = require('./app/intent/[id]').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BroadcasterProfileScreen = require('./app/profile/[id]').default;
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MessagesScreen = require('./app/(tabs)/messages').default;

describe('native page set', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
  });

  it('opens intent detail from the For You feed', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    expect(view.getByText('Two people for badminton tonight')).toBeTruthy();
    expect(view.getByText("Why this reached you: You play nearby on weekday evenings.")).toBeTruthy();

    await user.press(view.getByRole('button', { name: 'Open intent: Two people for badminton tonight' }));

    expect(mockPush).toHaveBeenCalledWith('/intent/badminton-tonight');
  });

  it('shows recipient intent detail with profile and request paths', async () => {
    const user = userEvent.setup();
    const view = await render(<IntentDetailScreen />);

    expect(view.getByText('Intent')).toBeTruthy();
    expect(view.getByText('Posted by')).toBeTruthy();
    expect(view.getByText('Aarav')).toBeTruthy();
    expect(view.getByText('Area approximate')).toBeTruthy();
    expect(view.getByText('Exact place hidden')).toBeTruthy();

    await user.press(view.getByRole('button', { name: 'Open broadcaster profile for Aarav' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/aarav');

    await user.press(view.getByRole('button', { name: 'Request to join' }));
    expect(mockPush).toHaveBeenCalledWith('/request/badminton-tonight');
  });

  it('keeps broadcaster profile minimal and contextual', async () => {
    const view = await render(<BroadcasterProfileScreen />);

    expect(view.getByText('Profile')).toBeTruthy();
    expect(view.getByText('One trusted connection')).toBeTruthy();
    expect(view.getByText('Contact details hidden until accepted')).toBeTruthy();
    expect(view.queryByText('Trust score')).toBeNull();
    expect(view.queryByText('followers')).toBeNull();
  });

  it('uses a bottom sheet style response screen with disclosure', async () => {
    const view = await render(<RequestSheetScreen />);

    // The sheet is now data-backed; its behaviour is covered in
    // response-sheet.test.tsx. This keeps the shell assertion: it is reachable
    // and it states the disclosure before anything is sent.
    expect(view.getByLabelText('Your note')).toBeTruthy();
    expect(view.getByLabelText('What they will see')).toBeTruthy();
  });

  it('shows minimal activity and messages tabs', async () => {
    const activity = await render(<ActivityScreen />);
    expect(activity.getByText('No responses yet')).toBeTruthy();
    expect(activity.getByText('Two people for badminton tonight')).toBeTruthy();

    const messages = await render(<MessagesScreen />);
    expect(messages.getByText('Messages')).toBeTruthy();
    expect(
      await messages.findByText('Messages appear after acceptance'),
    ).toBeTruthy();
  });
});
