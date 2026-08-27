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
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 12.97, longitude: 77.64 } })),
  reverseGeocodeAsync: jest.fn(async () => [{ district: 'Indiranagar', city: 'Bengaluru' }]),
  geocodeAsync: jest.fn(async () => [{ latitude: 12.93, longitude: 77.62 }]),
  Accuracy: { Balanced: 3 },
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///picked.jpg' }] })),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(async () => 'file:///cap.png'),
}));

jest.mock('react-native-maps', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  const MapView = (props: { onPress?: (e: unknown) => void }) => <View testID="mapview" {...props} />;
  const Marker = (props: object) => <View testID="marker" {...props} />;
  return {
    __esModule: true,
    default: MapView,
    Marker,
    PROVIDER_DEFAULT: 'default',
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetCastStore } = require('./features/casts/store');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAttendanceStore } = require('./features/attendance/store');

beforeEach(() => {
  resetCastStore();
  resetAttendanceStore();
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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FilterScreen = require('./app/filter').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AreaScreen = require('./app/area').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ChatScreen = require('./app/chat/[id]').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CirclesScreen = require('./app/circles').default;

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
    expect(view.getByText('SPORTS')).toBeTruthy();
    // the why line is computed by the delivery framework, never fixture prose.
    // multiple casts can legitimately share a top-2 reason string, so match all.
    expect(view.getAllByText('why you: one trusted link away · near you in indiranagar ›').length).toBeGreaterThanOrEqual(1);
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

  it('explains delivery on the why tap: fired signals plus what is never used', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(view.getAllByRole('button', { name: "why you're seeing this" })[0]);

    const [title, body] = alertSpy.mock.calls[0] as [string, string];
    expect(title).toBe("why you're seeing this");
    expect(body).toContain('one trusted link away');
    expect(body).toContain('never used to decide');
    expect(body).toContain('your exact location');
    alertSpy.mockRestore();
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
    expect(view.getByText(/the exact place stays hidden until you're both in\. chat is in-app/)).toBeTruthy();
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
    expect(view.getByText(/the exact place stays hidden until both sides say yes\./)).toBeTruthy();
  });
});

describe('compose', () => {
  beforeEach(() => {
    mockBack.mockReset();
  });

  it('keeps step 1 gated until both a category and a cast exist', async () => {
    const user = userEvent.setup();
    const view = await render(<ComposeScreen />);

    const next = view.getByRole('button', { name: 'next: add details' });
    expect(next.props.accessibilityState).toMatchObject({ disabled: true });

    // text alone is not enough: the category is required
    await user.type(view.getByLabelText('your cast'), 'chess in the park.');
    expect(view.getByRole('button', { name: 'next: add details' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });

    await user.press(view.getByRole('radio', { name: 'games' }));
    expect(view.getByRole('button', { name: 'next: add details' }).props.accessibilityState).toMatchObject({
      disabled: false,
    });
  });

  it('lands on details with reach defaulting to friends of circles', async () => {
    const user = userEvent.setup();
    const view = await render(<ComposeScreen />);

    await user.press(view.getByRole('radio', { name: 'sports' }));
    await user.type(view.getByLabelText('your cast'), 'badminton after work. need two.');
    await user.press(view.getByRole('button', { name: 'next: add details' }));

    expect(view.getByText('where, when, who?')).toBeTruthy();
    await user.press(view.getByLabelText('who sees it'));
    const adjacent = view.getByRole('radio', { name: 'friends of circles' });
    expect(adjacent.props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByText('wider reach never happens on its own.')).toBeTruthy();
  });

  it('publishes the cast into the sent frame and the feed', async () => {
    const user = userEvent.setup();
    const view = await render(<ComposeScreen />);

    await user.press(view.getByRole('radio', { name: 'games' }));
    await user.type(view.getByLabelText('your cast'), 'chess in the park sunday morning.');
    await user.press(view.getByRole('button', { name: 'next: add details' }));
    await user.press(view.getByRole('button', { name: 'cast it' }));

    expect(await view.findByText('OUT')).toBeTruthy();
    expect(view.getByRole('button', { name: 'done' })).toBeTruthy();

    const feed = await render(<HomeScreen />);
    // present twice by design: the feed poster and the "your casts" row
    expect(feed.getAllByText('chess in the park sunday morning.').length).toBeGreaterThanOrEqual(2);
  });

  it('sends the area row to its own screen and opens the time picker inline', async () => {
    const user = userEvent.setup();
    const view = await render(<ComposeScreen />);

    await user.press(view.getByRole('radio', { name: 'sports' }));
    await user.type(view.getByLabelText('your cast'), 'badminton after work.');
    await user.press(view.getByRole('button', { name: 'next: add details' }));

    await user.press(view.getByRole('button', { name: 'area' }));
    expect(mockPush).toHaveBeenCalledWith('/area');

    await user.press(view.getByRole('button', { name: 'time' }));
    expect(view.getByTestId('datetimepicker')).toBeTruthy();
  });
});

describe('area screen', () => {
  it('suggests real nearby areas and keeps the field above the results', async () => {
    const view = await render(<AreaScreen />);

    expect(view.getByLabelText('search area by name')).toBeTruthy();
    expect(view.getByRole('button', { name: 'use my location' })).toBeTruthy();
    expect(view.getByText('casts show the area only. the exact spot stays hidden.')).toBeTruthy();
    // ring sampling turns one position into several neighborhood names
    expect(await view.findByRole('button', { name: 'indiranagar' })).toBeTruthy();
  });
});

describe('filter sheet', () => {
  beforeEach(() => {
    mockBack.mockReset();
  });

  it('multi-selects categories and states the honest count', async () => {
    const user = userEvent.setup();
    const view = await render(<FilterScreen />);

    expect(view.getByRole('button', { name: 'show everything' })).toBeTruthy();
    expect(view.getByText('resets when you leave the feed. your feed never narrows silently.')).toBeTruthy();

    await user.press(view.getByRole('button', { name: 'sports' }));
    expect(view.getByRole('button', { name: 'show 1 cast' })).toBeTruthy();

    await user.press(view.getByRole('button', { name: 'music + nightlife' }));
    expect(view.getByRole('button', { name: 'show 2 casts' })).toBeTruthy();
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
    // trust phrase is now COMPUTED from the graph, never a fixture string.
    // aarav shares 'badminton-gang' with me, so the phrase is "in your circle".
    expect(view.getByText('indiranagar · in your circle')).toBeTruthy();
    expect(view.getByText('31 plans made real · 0 flakes · casting since march')).toBeTruthy();
    expect(view.getByText('vouched by 2 people you trust')).toBeTruthy();
    expect(view.getByText('badminton after work. need two.')).toBeTruthy();
    expect(view.getByRole('button', { name: 'block Aarav' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'report Aarav' })).toBeTruthy();
    expect(view.getByLabelText('photo of Aarav')).toBeTruthy();
    expect(view.queryByText(/followers/i)).toBeNull();
  });

  it('opens from the feed poster caster line', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(view.getAllByRole('button', { name: /about aarav/ })[0]);
    expect(mockPush).toHaveBeenCalledWith('/caster/aarav');
  });
});

describe('chat', () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockParams = { id: 'badminton-after-work' };
  });

  it('shows earlier messages for context and keeps send dead until text exists', async () => {
    const view = await render(<ChatScreen />);

    expect(view.getByText('you matched. earlier messages are here for context.')).toBeTruthy();
    expect(view.getByText('saw your cast — i’m in')).toBeTruthy();
    expect(view.getByText('done. see you at the gate')).toBeTruthy();

    const send = view.getByRole('button', { name: 'send' });
    expect(send.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('sends a new message into the thread', async () => {
    const user = userEvent.setup();
    const view = await render(<ChatScreen />);

    await user.type(view.getByLabelText('message'), 'on my way');
    await user.press(view.getByRole('button', { name: 'send' }));

    expect(await view.findByText('on my way')).toBeTruthy();
  });
});

describe('circles', () => {
  it('lists the viewer’s circles with member counts', async () => {
    const view = await render(<CirclesScreen />);

    expect(view.getByText('circles')).toBeTruthy();
    expect(view.getByText('badminton gang')).toBeTruthy();
    expect(view.getByText('3 people')).toBeTruthy();
    expect(
      view.getByText('you add people you have met through the app. they are never told which circle.'),
    ).toBeTruthy();
  });
});
