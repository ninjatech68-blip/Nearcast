import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

const tabScreens: { name: string; title?: string }[] = [];
const redirects: string[] = [];

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text, View } = require('react-native');

  function Tabs({ children }: { children: React.ReactNode }) {
    return <View testID="native-tabs">{children}</View>;
  }

  Tabs.Screen = function Screen({ name, options }: { name: string; options?: { title?: string } }) {
    tabScreens.push({ name, title: options?.title });
    return null;
  };

  function Redirect({ href }: { href: string }) {
    redirects.push(href);
    return <Text testID="redirect">{href}</Text>;
  }

  return { Redirect, Tabs };
});

jest.mock('expo-symbols', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');

  return {
    SymbolView: ({ fallback }: { fallback?: React.ReactNode }) => <Text>{fallback}</Text>,
  };
});

const mockUseSession = jest.fn<() => { status: 'loading' | 'signed-out' | 'signed-in' }>();
jest.mock('@/features/auth/session', () => ({
  useSession: () => mockUseSession(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TabsLayout = require('./app/(tabs)/_layout').default;

describe('TabsLayout', () => {
  beforeEach(() => {
    tabScreens.length = 0;
    redirects.length = 0;
    mockUseSession.mockReset();
  });

  it('uses native tabs for primary mobile navigation once signed in', async () => {
    mockUseSession.mockReturnValue({ status: 'signed-in' });

    const view = await render(<TabsLayout />);

    expect(view.getByTestId('native-tabs')).toBeTruthy();
    // Four destinations per the governed information architecture. Coordination
    // lives inside Activity, so there is deliberately no chat destination.
    expect(tabScreens).toEqual([
      { name: 'index', title: 'For You' },
      { name: 'broadcast', title: 'Broadcast' },
      { name: 'activity', title: 'Activity' },
      { name: 'you', title: 'You' },
    ]);
    expect(redirects).toEqual([]);
  });

  it('redirects a signed-out cold boot to /sign-in so the app is never a dead end', async () => {
    mockUseSession.mockReturnValue({ status: 'signed-out' });

    const view = await render(<TabsLayout />);

    expect(redirects).toEqual(['/sign-in']);
    expect(view.queryByTestId('native-tabs')).toBeNull();
  });

  it('renders nothing while the persisted session is being restored, so the splash stays up', async () => {
    mockUseSession.mockReturnValue({ status: 'loading' });

    const view = await render(<TabsLayout />);

    expect(redirects).toEqual([]);
    expect(view.queryByTestId('native-tabs')).toBeNull();
    expect(view.queryByTestId('redirect')).toBeNull();
  });
});
