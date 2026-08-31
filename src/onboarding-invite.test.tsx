import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render as rawRender, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { InviteOutcome } from '@/features/auth/invite';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

function render(ui: React.ReactElement) {
  return rawRender(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);
}

const mockRedeem = jest.fn<() => Promise<InviteOutcome>>();
const mockConfigured = jest.fn<() => boolean>();

jest.mock('@/infrastructure/supabase/client', () => ({
  isBackendConfigured: () => mockConfigured(),
  getSupabase: () => null,
  backendMode: () => 'live',
  backendStatus: () => 'connected',
}));

jest.mock('@/features/auth/invite', () => {
  const actual = jest.requireActual('@/features/auth/invite') as object;

  return { ...actual, redeemInvite: () => mockRedeem() };
});

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const OnboardingScreen = require('./app/onboarding/index').default;

async function toInviteStep(user: ReturnType<typeof userEvent.setup>) {
  const view = await render(<OnboardingScreen />);

  await user.type(view.getByLabelText('your first name'), 'Piyush');
  await user.press(view.getByRole('button', { name: 'next' }));

  return view;
}

describe('the invitation step', () => {
  beforeEach(() => {
    mockRedeem.mockReset();
    mockConfigured.mockReset();
    mockConfigured.mockReturnValue(true);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./features/me/me-store').resetMeStore();
  });

  it('stands between the name and the rest of joining', async () => {
    const user = userEvent.setup();
    const view = await toInviteStep(user);

    expect(view.getByText('NEARCAST · INVITATION')).toBeTruthy();
    expect(view.getByLabelText('invitation code')).toBeTruthy();
  });

  it('cannot be advanced without a code', async () => {
    const user = userEvent.setup();
    const view = await toInviteStep(user);

    expect(
      view.getByRole('button', { name: 'join' }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
  });

  it('moves on once an invitation is genuinely redeemed', async () => {
    mockRedeem.mockResolvedValue('redeemed');
    const user = userEvent.setup();
    const view = await toInviteStep(user);

    await user.type(view.getByLabelText('invitation code'), 'a-code');
    await user.press(view.getByRole('button', { name: 'join' }));

    expect(await view.findByText('NEARCAST · HOME')).toBeTruthy();
  });

  /**
   * The step is the membership boundary. A refused invitation must leave
   * the person exactly where they were, not deposit them inside the app.
   */
  it('keeps someone out when the invitation is refused', async () => {
    mockRedeem.mockResolvedValue('invalid_invite');
    const user = userEvent.setup();
    const view = await toInviteStep(user);

    await user.type(view.getByLabelText('invitation code'), 'a-code');
    await user.press(view.getByRole('button', { name: 'join' }));

    expect(await view.findByText(/cannot be used/)).toBeTruthy();
    expect(view.getByText('NEARCAST · INVITATION')).toBeTruthy();
  });

  it('says when there were too many tries, rather than repeating itself', async () => {
    mockRedeem.mockResolvedValue('rate_limited');
    const user = userEvent.setup();
    const view = await toInviteStep(user);

    await user.type(view.getByLabelText('invitation code'), 'a-code');
    await user.press(view.getByRole('button', { name: 'join' }));

    expect(await view.findByText(/an hour/)).toBeTruthy();
  });

  /**
   * A fixture build has no membership to grant. Showing the step there
   * would either block a developer forever or invite a fake pass.
   */
  it('is absent when there is no backend to redeem against', async () => {
    mockConfigured.mockReturnValue(false);
    const user = userEvent.setup();
    const view = await toInviteStep(user);

    expect(view.queryByLabelText('invitation code')).toBeNull();
    expect(view.getByText('NEARCAST · HOME')).toBeTruthy();
  });
});
