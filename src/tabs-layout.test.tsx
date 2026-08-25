import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

const tabScreens: { name: string; title?: string }[] = [];

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');

  function Tabs({ children }: { children: React.ReactNode }) {
    return <View testID="native-tabs">{children}</View>;
  }

  Tabs.Screen = function Screen({ name, options }: { name: string; options?: { title?: string } }) {
    tabScreens.push({ name, title: options?.title });
    return null;
  };

  return { Tabs };
});

jest.mock('expo-symbols', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');

  return {
    SymbolView: ({ fallback }: { fallback?: React.ReactNode }) => <Text>{fallback}</Text>,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TabsLayout = require('./app/(tabs)/_layout').default;

describe('TabsLayout', () => {
  it('uses native tabs for primary mobile navigation', async () => {
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
  });
});
