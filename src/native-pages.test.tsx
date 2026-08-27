import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  useLocalSearchParams: () => ({ id: 'badminton-tonight' }),
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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MyIntentsScreen = require('./app/(tabs)/my-intents').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YouScreen = require('./app/(tabs)/you').default;

describe('native page set', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    mockBack.mockReset();
  });

  it('opens intent detail from the For you feed', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    expect(view.getByText('Two more players for badminton after work')).toBeTruthy();
    expect(view.getAllByText('Why you’re seeing this').length).toBeGreaterThan(0);

    await user.press(view.getByRole('button', { name: 'Open intent: Two more players for badminton after work' }));

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
    expect(view.getByText('Why you’re seeing this')).toBeTruthy();

    await user.press(view.getByRole('button', { name: 'Open broadcaster profile for Aarav' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/aarav');

    await user.press(view.getByRole('button', { name: 'Request to join' }));
    expect(mockPush).toHaveBeenCalledWith('/request/badminton-tonight');
  });

  it('keeps broadcaster profile minimal and contextual', async () => {
    const view = await render(<BroadcasterProfileScreen />);

    expect(view.getByText('Profile')).toBeTruthy();
    expect(view.getByText('One trusted connection')).toBeTruthy();
    expect(view.getByText('Hidden until accepted')).toBeTruthy();
    expect(view.queryByText('Trust score')).toBeNull();
    expect(view.queryByText('followers')).toBeNull();
  });

  it('uses a bottom sheet style request screen with disclosure', async () => {
    const view = await render(<RequestSheetScreen />);

    expect(view.getByText('Request to join')).toBeTruthy();
    expect(view.getByText('Aarav will see your first name and response.')).toBeTruthy();
    expect(view.getByText('Exact contact details stay hidden')).toBeTruthy();
    expect(view.getByPlaceholderText('Add a short note')).toBeTruthy();
  });

  it('shows the activity tab with attention items and filters', async () => {
    const activity = await render(<ActivityScreen />);
    expect(activity.getByText('Activity')).toBeTruthy();
    expect(activity.getByText('Needs your attention')).toBeTruthy();
    expect(activity.getByText('Riya responded')).toBeTruthy();
    expect(activity.getByText('Your intents')).toBeTruthy();
  });

  it('lists the user’s broadcasts on the my intents tab', async () => {
    const view = await render(<MyIntentsScreen />);
    expect(view.getByText('My intents')).toBeTruthy();
    expect(view.getByText('Badminton after work')).toBeTruthy();
  });

  it('shows the settings-anchored You tab', async () => {
    const view = await render(<YouScreen />);
    expect(view.getByText('You')).toBeTruthy();
    expect(view.getByText('Privacy')).toBeTruthy();
    expect(view.getByText('Trusted circles')).toBeTruthy();
  });
});
