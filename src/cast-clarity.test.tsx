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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YouScreen = require('./app/(tabs)/you').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ActivityScreen = require('./app/(tabs)/activity').default;

describe('feed clarity', () => {
  it('explains why a cast reached you in plain language', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByText('Shown because you play nearby on weekday evenings.')).toBeTruthy();
  });

  it('states how long a cast stays open rather than when it expires', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByText('Open for another 7 hours')).toBeTruthy();
  });

  it('names the join action as a request, not a commitment', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByText('Ask to join')).toBeTruthy();
  });

  it('says who receives the request and what stays private', async () => {
    const view = await render(<HomeScreen />);

    expect(
      view.getByText('Your request goes to Aarav. Your exact location stays private.'),
    ).toBeTruthy();
  });
});

describe('first-run teaching', () => {
  it('teaches what a cast is on the feed', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByText('What you are seeing')).toBeTruthy();
    expect(
      view.getByText(
        'A cast is a plan someone nearby opened up. Asking to join sends them a private request — nothing is shared with anyone else until they accept.',
      ),
    ).toBeTruthy();
  });

  it('lets the teaching note be dismissed', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(view.getByRole('button', { name: 'Dismiss explanation' }));

    expect(view.queryByText('What you are seeing')).toBeNull();
  });
});

describe('profile clarity', () => {
  it('states an empty circles state warmly and says how it grows', async () => {
    const view = await render(<YouScreen />);

    expect(view.getByText('No circles yet')).toBeTruthy();
    expect(
      view.getByText('Join a few casts and people you meet can vouch for you.'),
    ).toBeTruthy();
  });

  it('describes Signal qualitatively and never as a score', async () => {
    const view = await render(<YouScreen />);

    expect(view.getByText('Signal building')).toBeTruthy();
    expect(
      view.getByText('Signal grows as casts you join or host actually happen.'),
    ).toBeTruthy();
    expect(view.queryByText(/\d+%/)).toBeNull();
    expect(view.queryByText(/\b\d\.\d\b/)).toBeNull();
  });

  it('explains what receipts are', async () => {
    const view = await render(<YouScreen />);

    expect(view.getByText('Your receipts')).toBeTruthy();
    expect(view.getByText('A record of casts that actually happened.')).toBeTruthy();
  });
});

describe('activity clarity', () => {
  it('uses cast language for your own casts', async () => {
    const view = await render(<ActivityScreen />);

    expect(view.getByText('Your casts')).toBeTruthy();
  });

  it('explains the empty requests state in terms of asking to join', async () => {
    const view = await render(<ActivityScreen />);

    expect(view.getByText('No one has asked to join yet')).toBeTruthy();
    expect(
      view.getByText('When someone asks to join a cast, it appears here.'),
    ).toBeTruthy();
  });
});
