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
    expect(view.getByText('Two people for badminton tonight')).toBeTruthy();
    expect(view.getByText("Shown because you play nearby on weekday evenings.")).toBeTruthy();
  });

  it('opens intent detail from the primary feed card', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(view.getByRole('button', { name: 'Open intent: Two people for badminton tonight' }));

    expect(mockPush).toHaveBeenCalledWith('/intent/badminton-tonight');
  });
});
