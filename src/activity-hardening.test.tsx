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
const ActivityScreen = require('./app/(tabs)/activity').default;

describe('activity states explain their consequence', () => {
  it('says what a pending request means and how long it can be undone', async () => {
    const view = await render(<ActivityScreen />);

    expect(
      view.getByText('You asked to join. You can withdraw until Aarav responds.'),
    ).toBeTruthy();
  });

  it('says how long your own cast stays open', async () => {
    const view = await render(<ActivityScreen />);

    expect(view.getByText('Open for another 7 hours. Nobody has asked to join yet.')).toBeTruthy();
  });

  it('says a draft is private rather than merely labelling it', async () => {
    const view = await render(<ActivityScreen />);

    expect(view.getByText('Only you can see this. It has not been posted.')).toBeTruthy();
  });
});

describe('activity actions are visible, not hidden behind long-press', () => {
  it('offers withdraw on a pending request', async () => {
    const view = await render(<ActivityScreen />);

    expect(view.getByRole('button', { name: 'Withdraw request' })).toBeTruthy();
  });

  it('offers cancel on your own live cast', async () => {
    const view = await render(<ActivityScreen />);

    expect(view.getByRole('button', { name: 'Cancel cast' })).toBeTruthy();
  });

  it('confirms before withdrawing rather than acting on first press', async () => {
    const user = userEvent.setup();
    const view = await render(<ActivityScreen />);

    await user.press(view.getByRole('button', { name: 'Withdraw request' }));

    expect(view.getByText('Withdraw your request?')).toBeTruthy();
    expect(
      view.getByText('Aarav will no longer see it. You can ask again while the cast is open.'),
    ).toBeTruthy();
  });
});
