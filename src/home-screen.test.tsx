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
  it('uses the distilled For you feed as the home page', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByText('For you')).toBeTruthy();
    expect(view.getByText('Relevant intents from nearby trusted networks.')).toBeTruthy();
    expect(view.getByText('Two more players for badminton after work')).toBeTruthy();
    expect(view.getAllByText('Why you’re seeing this').length).toBeGreaterThan(0);
  });

  it('opens intent detail from the primary feed card', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(view.getByRole('button', { name: 'Open intent: Two more players for badminton after work' }));

    expect(mockPush).toHaveBeenCalledWith('/intent/badminton-tonight');
  });
});
