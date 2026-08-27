import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render as rawRender, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

function render(ui: React.ReactElement) {
  return rawRender(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);
}

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = { id: 'badminton-after-work' };

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    push: (...args: unknown[]) => mockPush(...args),
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

jest.mock('@react-native-community/datetimepicker', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="datetimepicker" />,
  };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 12.97, longitude: 77.64 } })),
  reverseGeocodeAsync: jest.fn(async () => [{ district: 'Indiranagar', city: 'Bengaluru' }]),
  geocodeAsync: jest.fn(async () => [{ latitude: 12.93, longitude: 77.62 }]),
  Accuracy: { Balanced: 3 },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetCastStore } = require('./features/casts/store');

beforeEach(() => {
  resetCastStore();
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HomeScreen = require('./app/index').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CastDetailScreen = require('./app/cast/[id]').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const JoinScreen = require('./app/join/[id]').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YouScreen = require('./app/you').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ComposeScreen = require('./app/compose').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CasterProfileScreen = require('./app/caster/[id]').default;

describe('home pager', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockParams = { id: 'badminton-after-work' };
  });

  it('renders the feed poster with its trust facts and the rail', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByText('badminton after work. need two.')).toBeTruthy();
    expect(view.getByText('indiranagar · 3 vouches · gone 10pm')).toBeTruthy();
    expect(view.getByText('why you: you play nearby on weekday evenings')).toBeTruthy();
    expect(view.getByRole('button', { name: 'cast' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'activity' })).toBeTruthy();
  });

  it('opens the detail sheet from the headline and the join sheet from the bar', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(view.getByRole('button', { name: 'Open cast: badminton after work. need two.' }));
    expect(mockPush).toHaveBeenCalledWith('/cast/badminton-after-work');

    await user.press(view.getAllByRole('button', { name: "I'm in" })[0]);
    expect(mockPush).toHaveBeenCalledWith('/join/badminton-after-work');
  });

  it('opens compose from the rail', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(view.getByRole('button', { name: 'cast' }));
    expect(mockPush).toHaveBeenCalledWith('/compose');
  });
});

describe('cast detail sheet', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockParams = { id: 'badminton-after-work' };
  });

  it('shows receipts at the decision moment, never a rating', async () => {
    const view = await render(<CastDetailScreen />);

    expect(view.getByText('Aarav cast this')).toBeTruthy();
    expect(view.getByText('31 plans made real · 0 flakes')).toBeTruthy();
    expect(view.getByLabelText('signal: 4 of 5')).toBeTruthy();
    expect(view.getByText("exact place + contact stay hidden until you're both in")).toBeTruthy();
  });

  it('renders the gone state for an expired or unknown cast', async () => {
    mockParams = { id: 'does-not-exist' };
    const view = await render(<CastDetailScreen />);

    expect(view.getByText("this one's gone.")).toBeTruthy();
    expect(view.getByText('it ended or got filled.')).toBeTruthy();
  });
});

describe('join sheet', () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockParams = { id: 'badminton-after-work' };
  });

  it('keeps send dead until a note exists and discloses exactly what is shared', async () => {
    const view = await render(<JoinScreen />);

    expect(view.getByText('tell Aarav')).toBeTruthy();
    expect(view.getByText('Aarav gets your first name + this note. nothing else.')).toBeTruthy();

    const send = view.getByRole('button', { name: 'send it' });
    expect(send.props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe('you sheet', () => {
  it('shows signal, private range, and receipts', async () => {
    const view = await render(<YouScreen />);

    expect(view.getByText('signal: strong')).toBeTruthy();
    expect(view.getByText('your cast reaches ~240 people · only you see this')).toBeTruthy();
    expect(view.getByText('receipts')).toBeTruthy();
    expect(view.getByText('exact places + contacts stay hidden until both sides say yes.')).toBeTruthy();
  });
});

describe('compose', () => {
  beforeEach(() => {
    mockBack.mockReset();
  });

  it('keeps the next step dead until a cast exists', async () => {
    const view = await render(<ComposeScreen />);

    const next = view.getByRole('button', { name: 'next: who sees it' });
    expect(next.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('moves to the reach step once the cast is written', async () => {
    const user = userEvent.setup();
    const view = await render(<ComposeScreen />);

    await user.type(view.getByLabelText('your cast'), 'badminton after work. need two.');
    await user.press(view.getByRole('button', { name: 'next: who sees it' }));

    expect(view.getByText('who sees it?')).toBeTruthy();
    expect(view.getByText('wider reach never happens on its own.')).toBeTruthy();

    const adjacent = view.getByRole('radio', { name: 'friends of circles' });
    expect(adjacent.props.accessibilityState).toMatchObject({ selected: true });
  });

  it('publishes the cast into the sent frame and the feed', async () => {
    const user = userEvent.setup();
    const view = await render(<ComposeScreen />);

    await user.type(view.getByLabelText('your cast'), 'chess in the park sunday morning.');
    await user.press(view.getByRole('button', { name: 'next: who sees it' }));
    await user.press(view.getByRole('button', { name: 'cast it' }));

    expect(await view.findByText('OUT')).toBeTruthy();
    expect(view.getByRole('button', { name: 'done' })).toBeTruthy();

    const feed = await render(<HomeScreen />);
    // present twice by design: the feed poster and the "your casts" row
    expect(feed.getAllByText('chess in the park sunday morning.').length).toBeGreaterThanOrEqual(2);
  });

  it('opens the custom area and time controls from their rows', async () => {
    const user = userEvent.setup();
    const view = await render(<ComposeScreen />);

    await user.press(view.getByRole('button', { name: 'area' }));
    expect(view.getByLabelText('search area by name')).toBeTruthy();
    expect(view.getByRole('button', { name: 'use my location' })).toBeTruthy();
    expect(view.getByText('casts show the area only. the exact spot stays hidden.')).toBeTruthy();
    await user.press(view.getByRole('button', { name: 'indiranagar' }));
    expect(view.getByText('indiranagar · stays approximate')).toBeTruthy();

    await user.press(view.getByRole('button', { name: 'time' }));
    expect(view.getByTestId('datetimepicker')).toBeTruthy();
  });

  it('suggests areas from device location', async () => {
    const user = userEvent.setup();
    const view = await render(<ComposeScreen />);

    await user.press(view.getByRole('button', { name: 'area' }));
    await user.press(view.getByRole('button', { name: 'use my location' }));

    expect(await view.findByRole('button', { name: 'indiranagar' })).toBeTruthy();
  });
});

describe('caster sheet', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockParams = { id: 'aarav' };
  });

  it('shows trust facts, live casts, and safety actions — nothing social', async () => {
    const view = await render(<CasterProfileScreen />);

    expect(view.getByText('Aarav')).toBeTruthy();
    expect(view.getByText('indiranagar · 1 trusted link away · your circle vouches')).toBeTruthy();
    expect(view.getByText('31 plans made real · 0 flakes · casting since march')).toBeTruthy();
    expect(view.getByText('vouched by 2 people you trust')).toBeTruthy();
    expect(view.getByText('badminton after work. need two.')).toBeTruthy();
    expect(view.getByRole('button', { name: 'block Aarav' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'report Aarav' })).toBeTruthy();
    expect(view.queryByText(/followers/i)).toBeNull();
  });

  it('opens from the feed poster caster line', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(view.getAllByRole('button', { name: /about aarav/ })[0]);
    expect(mockPush).toHaveBeenCalledWith('/caster/aarav');
  });
});
