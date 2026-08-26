import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen, userEvent, waitFor } from '@testing-library/react-native';

import { renderScreen } from './test-utils';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a), push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ token: 'local-invite-1' }),
}));

const mockRefreshProfile = jest.fn<() => Promise<void>>();
jest.mock('@/features/auth/session', () => ({
  useSession: () => ({
    status: 'signed-in',
    hasProfile: false,
    userId: 'newcomer',
    refreshProfile: mockRefreshProfile,
  }),
}));

const mockRedeem = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('@/features/auth/sign-in', () => ({
  redeemInvitation: (...a: unknown[]) => mockRedeem(...a),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RedeemInviteScreen = require('./app/invite/[token]').default;

describe('RedeemInviteScreen adult affirmation', () => {
  beforeEach(() => {
    mockRedeem.mockReset();
    mockReplace.mockReset();
    mockRefreshProfile.mockReset();
    mockRefreshProfile.mockResolvedValue(undefined);
  });

  it('will not create an account until the person affirms they are an adult', async () => {
    const user = userEvent.setup();

    await renderScreen(<RedeemInviteScreen />);
    await user.type(screen.getByLabelText('Display name'), 'Ana Applicant');

    expect(screen.getByRole('button', { name: 'Join network' }).props.accessibilityState.disabled).toBe(
      true,
    );
    expect(mockRedeem).not.toHaveBeenCalled();
  });

  it('passes the affirmation through as a deliberate act, never as a default', async () => {
    mockRedeem.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    await renderScreen(<RedeemInviteScreen />);
    await user.type(screen.getByLabelText('Display name'), 'Ana Applicant');
    await user.press(screen.getByTestId('adult-affirmation'));
    await user.press(screen.getByRole('button', { name: 'Join network' }));

    await waitFor(() => expect(mockRedeem).toHaveBeenCalledTimes(1));
    expect(mockRedeem).toHaveBeenCalledWith('local-invite-1', 'Ana Applicant', true);
  });

  it('lets the person take the affirmation back', async () => {
    const user = userEvent.setup();

    await renderScreen(<RedeemInviteScreen />);
    await user.type(screen.getByLabelText('Display name'), 'Ana Applicant');
    await user.press(screen.getByTestId('adult-affirmation'));
    await user.press(screen.getByTestId('adult-affirmation'));

    expect(screen.getByRole('button', { name: 'Join network' }).props.accessibilityState.disabled).toBe(
      true,
    );
  });

  it('states the age requirement in words, not only as a control', async () => {
    await renderScreen(<RedeemInviteScreen />);

    expect(screen.getByText(/18 or over/)).toBeTruthy();
  });
});
