import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render as rawRender, userEvent } from '@testing-library/react-native';
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
    replace: (...args: unknown[]) => mockPush(...args),
  },
  useLocalSearchParams: () => mockParams,
  useSegments: () => [],
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
const { resetCastStore, setDraftArea } = require('./features/casts/store');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAttendanceStore } = require('./features/attendance/store');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { testOnly_bypassGates } = require('./features/me/me-store');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetSubmit, setFailureMode } = require('./infrastructure/net/submit');

beforeEach(() => {
  resetCastStore();
  resetAttendanceStore();
  resetSubmit();
  testOnly_bypassGates();
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HomeScreen = require('./app/index').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CastDetailScreen = require('./app/cast/[id]').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const JoinScreen = require('./app/join/[id]').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { YouPage } = require('./features/me/you-page');
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
const { answerWindowRequest, extendChat } = require('./features/chat/chat');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CirclesScreen = require('./app/circles').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const OnboardingScreen = require('./app/onboarding/index').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AreasScreen = require('./app/areas').default;

describe('home pager', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockParams = { id: 'badminton-after-work' };
  });

  it('renders the feed poster with its trust facts and the dock', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByText('badminton after work. need two.')).toBeTruthy();
    expect(view.getByText('indiranagar · 3 vouches · gone 10pm')).toBeTruthy();
    expect(view.getByText('SPORTS')).toBeTruthy();
    // the why line is computed by the delivery framework, never fixture prose.
    // multiple casts can legitimately share a top-2 reason string, so match all.
    expect(view.getAllByText('why you: one trusted link away · near you in indiranagar ›').length).toBeGreaterThanOrEqual(1);
    // five slots, compose in the middle: four destinations plus an
    // action is the only arrangement that balances on an even grid.
    expect(view.getByRole('button', { name: 'cast something' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'near' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'you' })).toBeTruthy();
    // chats and alerts carry their counts in the label when they have one
    expect(view.getByRole('button', { name: /^chats/ })).toBeTruthy();
    expect(view.getByRole('button', { name: /^alerts/ })).toBeTruthy();
  });

  it('counts what is waiting on the dock, and says so out loud', async () => {
    const view = await render(<HomeScreen />);

    // the fixture viewer has join requests waiting on them. the count is
    // decisions owed, never a total of things to look at — a number that
    // includes what you have already read is one nobody can clear.
    expect(view.getByRole('button', { name: /^alerts, \d+ waiting$/ })).toBeTruthy();
  });

  it('marks the selected slot as selected, so the state is not colour alone', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByRole('button', { name: 'near' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByRole('button', { name: 'you' }).props.accessibilityState).toMatchObject({ selected: false });
  });

  it('never shows one particular tester’s initials on everyone’s avatar', async () => {
    const view = await render(<HomeScreen />);

    // the dot was hard-coded to "PS" for every user on every screen
    // one on the poster, one on the activity header — neither is "PS"
    expect(view.getAllByRole('button', { name: 'you' }).length).toBeGreaterThanOrEqual(1);
    expect(view.queryByText('PS')).toBeNull();
  });

  it('shows only the alert groups that have rows, each carrying its count', async () => {
    const view = await render(<HomeScreen />);

    // every tab label carries a real count — that is what buys back the
    // scent a tab normally costs.
    const tabs = view.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThanOrEqual(2);
    for (const tab of tabs) {
      expect(tab.props.accessibilityLabel).toMatch(/^(needs you|news|your plans), \d+$/);
      expect(tab.props.accessibilityLabel).not.toMatch(/, 0$/);
    }
    // exactly one is selected, and it is the first populated one
    expect(tabs.filter((t) => t.props.accessibilityState?.selected)).toHaveLength(1);
    expect(tabs[0].props.accessibilityState).toMatchObject({ selected: true });
  });

  it('replaces the wordmark chevron with a real lens control', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByRole('button', { name: /^search and filter/ })).toBeTruthy();
    expect(view.queryByText('NEARCAST ⌄')).toBeNull();
    expect(view.getAllByText('NEARCAST').length).toBeGreaterThanOrEqual(1);
  });

  it('opens the detail sheet from the headline and the join sheet from the bar', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(view.getByRole('button', { name: 'Open cast: badminton after work. need two.' }));
    expect(mockPush).toHaveBeenCalledWith('/cast/badminton-after-work');

    await user.press(view.getAllByRole('button', { name: 'ask to join' })[0]);
    expect(mockPush).toHaveBeenCalledWith('/join/badminton-after-work');
  });

  it('opens compose from the dock', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(view.getByRole('button', { name: 'cast something' }));
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

    // the PLAN is the title; the caster is a capsule beside it
    expect(view.getByText('badminton after work. need two.')).toBeTruthy();
    expect(view.getByText('31 plans made real · 0 flakes')).toBeTruthy();
    expect(view.getByLabelText('signal: 4 of 5')).toBeTruthy();
    expect(view.getByText(/casts show the neighbourhood, never an exact spot\./)).toBeTruthy();
  });

  it('opens the caster profile only from the caster capsule', async () => {
    const user = userEvent.setup();
    const view = await render(<CastDetailScreen />);

    // tapping the plan's own copy must not navigate anywhere
    await user.press(view.getByText('badminton after work. need two.'));
    expect(mockPush).not.toHaveBeenCalled();

    await user.press(view.getByRole('button', { name: 'about Aarav' }));
    expect(mockPush).toHaveBeenCalledWith('/caster/aarav');
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

    expect(view.getByText('ask Aarav')).toBeTruthy();
    expect(view.getByText('Aarav gets your first name + this note. nothing else.')).toBeTruthy();

    const send = view.getByRole('button', { name: 'send request' });
    expect(send.props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe('you', () => {
  it('shows signal and receipts, and never a fabricated range number', async () => {
    const view = await render(<YouPage />);

    expect(view.getByText('signal: strong')).toBeTruthy();
    expect(view.getByText('your receipts')).toBeTruthy();
    // the old "~240 people" range was invented — a product-law breach —
    // and named a reach model that no longer exists. it must be gone.
    expect(view.queryByText(/reaches ~\d+ people/)).toBeNull();
    expect(view.queryByText(/range:/)).toBeNull();
  });

  it('orders the hub by consequence, with circles first and settings behind one door', async () => {
    const view = await render(<YouPage />);

    // the controls that decide how the app reaches you
    expect(view.getByText('circles')).toBeTruthy();
    expect(view.getByText('blocked')).toBeTruthy();
    // one door, and nothing destructive on the way to it
    expect(view.getByText('edit profile')).toBeTruthy();
    expect(view.queryByText('delete account')).toBeNull();
    expect(view.queryByText('sign out')).toBeNull();
    expect(view.queryByText('terms + privacy')).toBeNull();
  });

  it('offers no control the app does not honour', async () => {
    const view = await render(<YouPage />);

    // Quiet hours persisted a window and nothing ever read it: no column
    // in the schema, nothing sent by profile sync, nothing checked by
    // send-push. A switch that promises the phone stays silent and does
    // not is worse to ship than a missing one, so it is gone until the
    // server side exists.
    expect(view.queryByText('quiet hours')).toBeNull();
    expect(view.queryByText(/does not make a sound/)).toBeNull();
  });

  it('puts the photo control on the photo, not in a settings row', async () => {
    const view = await render(<YouPage />);

    expect(view.getByRole('button', { name: /photo/ })).toBeTruthy();
    // a row labelled "photo" three screens deep is what this replaces
    expect(view.queryByText('photo')).toBeNull();
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

  it('lands on details with a casting radius already chosen, and never asks for a headcount', async () => {
    const user = userEvent.setup();
    const view = await render(<ComposeScreen />);

    await user.press(view.getByRole('radio', { name: 'sports' }));
    await user.type(view.getByLabelText('your cast'), 'badminton after work. need two.');
    await user.press(view.getByRole('button', { name: 'next: add details' }));

    // the default is a distance, picked for you — no decision to make
    const five = view.getByRole('radio', { name: '5 km' });
    expect(five.props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByText(/a few neighbourhoods/)).toBeTruthy();

    // and the ladder it replaced is gone, along with slots
    expect(view.queryByRole('radio', { name: 'friends of circles' })).toBeNull();
    expect(view.queryByText(/slot/i)).toBeNull();
    expect(view.queryByText(/how many/i)).toBeNull();
  });

  it('widens the radius when a further choice is picked', async () => {
    const user = userEvent.setup();
    const view = await render(<ComposeScreen />);

    await user.press(view.getByRole('radio', { name: 'games' }));
    await user.type(view.getByLabelText('your cast'), 'chess in the park.');
    await user.press(view.getByRole('button', { name: 'next: add details' }));

    await user.press(view.getByRole('radio', { name: '25 km' }));
    expect(view.getByRole('radio', { name: '25 km' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(view.getByText(/the whole city/)).toBeTruthy();
  });

  it('will not cast until an area is picked — nothing is auto-filled', async () => {
    const user = userEvent.setup();
    const view = await render(<ComposeScreen />);

    await user.press(view.getByRole('radio', { name: 'games' }));
    await user.type(view.getByLabelText('your cast'), 'chess in the park sunday morning.');
    await user.press(view.getByRole('button', { name: 'next: add details' }));

    // the area starts empty (no auto-detect, no home-area prefill) and the
    // cast button is gated until the caster picks one
    expect(view.getByText('add approximate area')).toBeTruthy();
    expect(view.getByRole('button', { name: 'cast it' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('publishes the cast into the sent frame and the feed', async () => {
    const user = userEvent.setup();
    const view = await render(<ComposeScreen />);

    await user.press(view.getByRole('radio', { name: 'games' }));
    await user.type(view.getByLabelText('your cast'), 'chess in the park sunday morning.');
    await user.press(view.getByRole('button', { name: 'next: add details' }));
    // the caster picks an area manually — the /area screen sets it; here
    // we set the draft directly to stand in for that pick.
    await act(async () => {
      setDraftArea('koramangala', { latitude: 12.9352, longitude: 77.6245 });
    });
    await user.press(view.getByRole('button', { name: 'cast it' }));

    expect(await view.findByText('OUT')).toBeTruthy();
    expect(view.getByRole('button', { name: 'done' })).toBeTruthy();

    const feed = await render(<HomeScreen />);
    // your own casts never appear in the feed (the feed is decisions to
    // make — yours aren't). they surface under the alerts page's "your
    // plans" group, which is where what you started lives. the tab label
    // carries the count, so match on the prefix.
    await user.press(feed.getByRole('tab', { name: /^your plans/ }));
    expect(feed.getAllByText('chess in the park sunday morning.').length).toBeGreaterThanOrEqual(1);
  });

  it('keeps the written cast when the send fails, and offers a retry', async () => {
    setFailureMode('always');
    const user = userEvent.setup();
    const view = await render(<ComposeScreen />);

    await user.press(view.getByRole('radio', { name: 'games' }));
    await user.type(view.getByLabelText('your cast'), 'chess in the park sunday morning.');
    await user.press(view.getByRole('button', { name: 'next: add details' }));
    await act(async () => {
      setDraftArea('koramangala', { latitude: 12.9352, longitude: 77.6245 });
    });
    await user.press(view.getByRole('button', { name: 'cast it' }));

    // the failure is stated, and the button becomes a retry
    expect(await view.findByText(/saved here/)).toBeTruthy();
    expect(view.getByRole('button', { name: 'try again' })).toBeTruthy();

    // and the cast never reached the feed
    const feed = await render(<HomeScreen />);
    expect(feed.queryByText('chess in the park sunday morning.')).toBeNull();
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
    expect(view.getByText('casts show the neighbourhood only. an exact spot is never stored.')).toBeTruthy();
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
    expect(view.getByText(/resets when you leave the feed/)).toBeTruthy();

    await user.press(view.getByRole('button', { name: 'sports' }));
    expect(view.getByRole('button', { name: 'show 1 cast' })).toBeTruthy();

    // the count is the HONEST, gated count — it equals what the feed
    // actually renders, so a second category with a deliverable cast
    // takes it to 2 (music has none delivered, games does).
    await user.press(view.getByRole('button', { name: 'games' }));
    expect(view.getByRole('button', { name: 'show 2 casts' })).toBeTruthy();
  });

  it('narrows the count by search text, and combines it with categories', async () => {
    const user = userEvent.setup();
    const view = await render(<FilterScreen />);

    // typing narrows to the casts whose text/caster/area/category match
    await user.type(view.getByLabelText('search casts'), 'badminton');
    expect(view.getByRole('button', { name: 'show 1 cast' })).toBeTruthy();

    // adding a category that the matched cast is NOT in empties the result
    await user.press(view.getByRole('button', { name: 'music + nightlife' }));
    expect(view.getByRole('button', { name: 'show 0 casts' })).toBeTruthy();
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
    expect(view.getByText('saw your cast, i’m in')).toBeTruthy();
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

  it('keeps the chat window label short enough to sit beside a name', async () => {
    const view = await render(<ChatScreen />);

    // short, live countdown form; never the long "expires in 22h"
    expect(view.getByText(/\d+h left/)).toBeTruthy();
    expect(view.queryByText('expires in 22h')).toBeNull();
  });

  it('offers one + for photos, GIFs and location, and no emoji row', async () => {
    const view = await render(<ChatScreen />);

    expect(view.getByRole('button', { name: 'send a photo, GIF or your location' })).toBeTruthy();
    // the emoji chips are gone: the system keyboard already has them
    expect(view.queryByRole('button', { name: 'add 👍' })).toBeNull();
  });

  it('asks the other side before a longer window, and does not extend on its own', async () => {
    const view = await render(<ChatScreen />);

    // a live countdown, and nothing pending yet
    expect(view.getByText(/\d+h left/)).toBeTruthy();
    expect(view.queryByRole('button', { name: 'agree' })).toBeNull();

    await act(async () => {
      await extendChat('badminton-after-work', 'always');
    });

    // asked, not done: the window is unchanged and the ask is on screen
    expect(view.getByText(/\d+h left/)).toBeTruthy();
    expect(view.getByText(/you asked for no expiry/)).toBeTruthy();
    // the person who asked cannot also agree — only take it back
    expect(view.queryByRole('button', { name: 'agree' })).toBeNull();
    expect(view.getByRole('button', { name: 'take it back' })).toBeTruthy();

    await act(async () => {
      await answerWindowRequest('badminton-after-work', true);
    });
    expect(view.getByText('open')).toBeTruthy();
  });

  it('opens the attachment tray in the chat, not a platform dialog', async () => {
    const user = userEvent.setup();
    const view = await render(<ChatScreen />);
    const plus = view.getByRole('button', { name: 'send a photo, GIF or your location' });

    expect(view.queryByRole('button', { name: 'camera' })).toBeNull();

    await user.press(plus);
    expect(view.getByRole('button', { name: 'camera' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'photo or GIF' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'location' })).toBeTruthy();

    // the + is a toggle: pressing it again puts the tray away
    await user.press(plus);
    expect(view.queryByRole('button', { name: 'camera' })).toBeNull();
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

describe('picking an area', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockParams = {};
  });

  /**
   * These guard the difference between a name and a place. Delivery
   * measures distance between area centres, so an area typed as free
   * text has no point behind it and can only ever be matched as a
   * string — which stops working the moment two people spell the same
   * place differently. Every path that adds an area has to go through
   * the picker.
   */
  it('auto-fills the home area from the device on entering the step', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { resetMeStore } = require('./features/me/me-store');
    resetMeStore();

    const user = userEvent.setup();
    const view = await render(<OnboardingScreen />);

    await user.type(view.getByLabelText('your first name'), 'Piyush');
    await user.press(view.getByRole('button', { name: 'next' }));

    // the mocked location resolves to Indiranagar; the step fetches it
    // rather than making the person search a map for where they stand.
    expect(await view.findByText('from your location · tap to change')).toBeTruthy();
    expect(view.getByText('indiranagar')).toBeTruthy();
  });

  it('lets you step back through onboarding until it is done', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { resetMeStore } = require('./features/me/me-store');
    resetMeStore();
    const user = userEvent.setup();
    const view = await render(<OnboardingScreen />);

    // no back on the first step
    expect(view.queryByLabelText('back')).toBeNull();

    await user.type(view.getByLabelText('your first name'), 'Piyush');
    await user.press(view.getByRole('button', { name: 'next' }));
    expect(view.getByText('NEARCAST · HOME')).toBeTruthy();

    // advance again, then back twice returns to the name step
    await user.press(view.getByRole('button', { name: 'next' }));
    expect(view.getByText('NEARCAST · AREAS')).toBeTruthy();
    await user.press(view.getByLabelText('back'));
    expect(view.getByText('NEARCAST · HOME')).toBeTruthy();
    await user.press(view.getByLabelText('back'));
    expect(view.getByText('NEARCAST · HELLO')).toBeTruthy();
  });

  it('still offers the map as a way to change the home area', async () => {
    const user = userEvent.setup();
    const view = await render(<OnboardingScreen />);

    await user.type(view.getByLabelText('your first name'), 'Piyush');
    await user.press(view.getByRole('button', { name: 'next' }));

    const home = view.getByLabelText('your home area');
    expect(home.props.accessibilityRole).toBe('button');
    await user.press(home);
    expect(mockPush).toHaveBeenCalledWith('/area?target=home');
  });

  it('replaces the demo seed with the area the person actually picked', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setHomeAreaFromOnboarding } = require('./features/me/me-store');
    setHomeAreaFromOnboarding('zirakpur', { latitude: 30.64, longitude: 76.82 });

    const view = await render(<AreasScreen />);
    expect(view.getByText('zirakpur')).toBeTruthy();
    // the seeded bangalore areas must not survive onboarding: someone
    // in chandigarh who kept them would be delivered another city's
    // casts, and would have no idea why.
    expect(view.queryByText('indiranagar')).toBeNull();
    expect(view.queryByText('koramangala')).toBeNull();
  });

  it('sends the onboarding areas step to the map too', async () => {
    const user = userEvent.setup();
    const view = await render(<OnboardingScreen />);

    await user.type(view.getByLabelText('your first name'), 'Piyush');
    await user.press(view.getByRole('button', { name: 'next' }));
    await user.press(view.getByRole('button', { name: 'next' }));

    await user.press(view.getByLabelText('add a neighborhood'));
    expect(mockPush).toHaveBeenCalledWith('/area?target=areas');
  });

  it('sends the areas settings screen to the map', async () => {
    const user = userEvent.setup();
    const view = await render(<AreasScreen />);

    await user.press(view.getByRole('button', { name: 'add an area' }));
    expect(mockPush).toHaveBeenCalledWith('/area?target=areas');
  });
});
