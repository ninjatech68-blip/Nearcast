import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render as rawRender, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { PublicCast } from '@/features/sharing/remote-share';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

function render(ui: React.ReactElement) {
  return rawRender(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);
}

const mockFetch = jest.fn<() => Promise<PublicCast | null>>();
const mockConfirm = jest.fn<() => Promise<{ kind: string; count?: number }>>();
const mockHasConfirmed = jest.fn<() => Promise<boolean>>();
const mockPush = jest.fn();
let mockSignedIn = false;

jest.mock('@/features/sharing/remote-share', () => ({
  fetchPublicCast: () => mockFetch(),
  confirmPublicCast: () => mockConfirm(),
  hasViewerConfirmed: () => mockHasConfirmed(),
}));

jest.mock('@/features/me/me-store', () => ({
  useMe: () => ({ signedIn: mockSignedIn, onboardingDone: true, name: 'Dev' }),
}));

jest.mock('expo-router', () => ({
  router: { push: (h: string) => mockPush(h), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ slug: 'slug-1' }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SharedCastScreen = require('./app/i/[slug]').default;

const cast = (overrides: Partial<PublicCast> = {}): PublicCast => ({
  id: 'intent-1',
  shareSlug: 'slug-1',
  category: 'sports',
  statement: 'Need one more for doubles on Thursday',
  area: 'indiranagar',
  startsAt: null,
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  casterFirstName: 'Asha',
  confirmationCount: 0,
  seatsTaken: 0,
  slotsWanted: null,
  ...overrides,
});

describe('a cast shared by link', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockConfirm.mockReset();
    mockHasConfirmed.mockReset();
    mockPush.mockReset();
    mockSignedIn = false;
    mockFetch.mockResolvedValue(cast());
    mockHasConfirmed.mockResolvedValue(false);
  });

  /**
   * MUST-022: a link recipient reads the cast before installing or signing
   * up. This is the only screen in the app a stranger can reach.
   */
  it('shows the cast to someone who is not signed in', async () => {
    const view = await render(<SharedCastScreen />);

    expect(await view.findByText('Need one more for doubles on Thursday')).toBeTruthy();
    expect(view.getByText(/indiranagar/)).toBeTruthy();
  });

  it('offers a stranger sign-in rather than a confirm button', async () => {
    const view = await render(<SharedCastScreen />);

    await view.findByText('Need one more for doubles on Thursday');
    expect(view.getByRole('button', { name: 'sign in to confirm' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'confirm this cast' })).toBeNull();
  });

  it('states an honest zero when nobody has confirmed', async () => {
    const view = await render(<SharedCastScreen />);

    await view.findByLabelText('confirmations');
    expect(view.getByText('nobody has confirmed this yet')).toBeTruthy();
  });

  /**
   * MUST-023: support is visible, membership is not. Nothing on this screen
   * may name or count toward identifying who confirmed.
   */
  it('never names a confirmer', async () => {
    mockFetch.mockResolvedValue(cast({ confirmationCount: 3 }));
    const view = await render(<SharedCastScreen />);

    await view.findByLabelText('confirmations');
    expect(view.getByText('3 people confirmed this')).toBeTruthy();
    expect(view.queryByText(/Mira|Dev Mehta|confirmed by/)).toBeNull();
  });

  it('says where the cast came from stays private', async () => {
    const view = await render(<SharedCastScreen />);

    await view.findByText('Need one more for doubles on Thursday');
    expect(view.getByText(/stays private/)).toBeTruthy();
  });

  it('lets a signed-in member confirm, and reflects the new count', async () => {
    mockSignedIn = true;
    mockConfirm.mockResolvedValue({ kind: 'confirmed', count: 1 });
    const user = userEvent.setup();
    const view = await render(<SharedCastScreen />);

    await user.press(await view.findByRole('button', { name: 'confirm this cast' }));

    expect(await view.findByText('you confirmed this')).toBeTruthy();
  });

  it('does not offer to confirm again once you have', async () => {
    mockSignedIn = true;
    mockHasConfirmed.mockResolvedValue(true);
    mockFetch.mockResolvedValue(cast({ confirmationCount: 1 }));
    const view = await render(<SharedCastScreen />);

    expect(await view.findByText('you confirmed this')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'confirm this cast' })).toBeNull();
  });

  it('explains that confirming needs an invitation, when it does', async () => {
    mockSignedIn = true;
    mockConfirm.mockResolvedValue({ kind: 'not_a_member' });
    const user = userEvent.setup();
    const view = await render(<SharedCastScreen />);

    await user.press(await view.findByRole('button', { name: 'confirm this cast' }));

    expect(await view.findByText(/need an invitation/)).toBeTruthy();
  });

  it('says a closed cast is closed rather than showing nothing', async () => {
    mockFetch.mockResolvedValue(null);
    const view = await render(<SharedCastScreen />);

    expect(await view.findByText(/no longer open/)).toBeTruthy();
  });
});
