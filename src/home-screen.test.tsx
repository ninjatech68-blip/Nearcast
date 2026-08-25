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
const HomeScreen = require('./app/index').default;

describe('HomeScreen', () => {
  it('uses the home page as a self-explanatory For You feed', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getAllByText('For You')).toHaveLength(2);
    expect(view.getByText('What is happening around you')).toBeTruthy();
    expect(view.getByText('Nothing relevant is active right now. Adjust your preferences or broadcast an intent.')).toBeTruthy();
    expect(view.getByText("Every future intent here will include a reason under Why you're seeing this.")).toBeTruthy();
  });

  it('opens the broadcast composer from the bottom navigation', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(view.getByRole('button', { name: 'Broadcast' }));

    expect(mockPush).toHaveBeenCalledWith('/create');
  });

  it('keeps unavailable navigation destinations visible with clear labels', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByRole('button', { name: 'Activity unavailable in this build' })).toBeDisabled();
    expect(view.getByRole('button', { name: 'You unavailable in this build' })).toBeDisabled();
  });
});
