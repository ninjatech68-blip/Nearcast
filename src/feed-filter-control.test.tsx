import { describe, expect, it, jest } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: () => undefined },
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

describe('feed filter is a real control', () => {
  // The container carries accessibilityRole="radiogroup" for TalkBack grouping,
  // but it is not asserted here: React Native only exposes a View to the
  // accessibility tree when `accessible` is set, and setting it would collapse
  // the group into one element and hide the individual radios from VoiceOver.
  // What matters, and what is observable, is each option's role and state.
  it('exposes each scope as its own radio', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByRole('radio', { name: 'All casts' })).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Nearby' })).toBeTruthy();
  });

  it('reports which scope is selected', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByRole('radio', { name: 'All casts' }).props.accessibilityState.selected).toBe(
      true,
    );
    expect(view.getByRole('radio', { name: 'Nearby' }).props.accessibilityState.selected).toBe(
      false,
    );
  });

  it('actually narrows the feed when a scope is chosen', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    expect(view.getByText('Walk and talk this evening')).toBeTruthy();

    await user.press(view.getByRole('radio', { name: 'Nearby' }));

    expect(view.queryByText('Walk and talk this evening')).toBeNull();
    expect(view.getByText('Two people for badminton tonight')).toBeTruthy();
  });

  it('restores the full feed when the scope is widened again', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(view.getByRole('radio', { name: 'Nearby' }));
    await user.press(view.getByRole('radio', { name: 'All casts' }));

    expect(view.getByText('Walk and talk this evening')).toBeTruthy();
  });

  it('meets the 48 point minimum target the screen contract requires', async () => {
    const view = await render(<HomeScreen />);
    const pill = view.getByRole('radio', { name: 'Nearby' });
    const style = Array.isArray(pill.props.style) ? pill.props.style.flat() : [pill.props.style];

    expect(style.some((entry: { minHeight?: number }) => (entry?.minHeight ?? 0) >= 48)).toBe(true);
  });

  it('no longer renders an unlabelled ellipsis glyph', async () => {
    const view = await render(<HomeScreen />);

    expect(view.queryByText('...')).toBeNull();
  });
});
