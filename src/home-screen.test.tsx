import { describe, expect, it, jest } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
  },
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

describe('HomeScreen', () => {
  it('uses a native-style For You feed as the home page', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByText('For You')).toBeTruthy();
    expect(view.getByText('Around you')).toBeTruthy();
    expect(view.getByText('Nothing relevant is active right now. Adjust your preferences or broadcast an intent.')).toBeTruthy();
    expect(view.getByText("Every intent will show Why you're seeing this before you respond.")).toBeTruthy();
  });

  it('opens the composer from the in-feed broadcast action', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(view.getByRole('button', { name: 'Broadcast an intent' }));

    expect(mockPush).toHaveBeenCalledWith('/create');
  });
});
