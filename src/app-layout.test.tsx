import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

const mockHideAsync = jest.fn<() => Promise<void>>();
const mockPreventAutoHideAsync = jest.fn<() => Promise<void>>();

jest.mock('expo-splash-screen', () => ({
  hideAsync: () => mockHideAsync(),
  preventAutoHideAsync: () => mockPreventAutoHideAsync(),
}));

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text, View } = require('react-native');

  function Stack({ children }: { children: React.ReactNode }) {
    return <View testID="root-stack">{children}</View>;
  }

  Stack.Screen = function Screen({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };

  return { Stack };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RootLayout = require('./app/_layout').default;

describe('RootLayout', () => {
  beforeEach(() => {
    mockHideAsync.mockReset();
    mockPreventAutoHideAsync.mockReset();
  });

  it('shows the app shell immediately and hides the splash screen', async () => {
    // Typography is native per DESIGN.md, so no font loading gates the shell.
    const view = await render(<RootLayout />);

    expect(view.getByTestId('root-stack')).toBeTruthy();
    expect(mockHideAsync).toHaveBeenCalledTimes(1);
  });
});
