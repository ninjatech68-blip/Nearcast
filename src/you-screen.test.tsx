import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen, userEvent, waitFor } from '@testing-library/react-native';

import { renderScreen } from './test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

const mockSignOut = jest.fn<() => Promise<void>>();
jest.mock('@/features/auth/session', () => ({
  useSession: () => ({
    status: 'signed-in',
    hasProfile: true,
    userId: 'uma',
    signOut: mockSignOut,
  }),
}));

const mockFetchProfile = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('@/features/intents/data/activity-queries', () => ({
  fetchProfileSummary: (...a: unknown[]) => mockFetchProfile(...a),
  describeReliability: () => 'No confirmed interactions yet',
}));

const mockDeleteAccount = jest.fn<() => Promise<unknown>>();
jest.mock('@/features/coordination/queries', () => ({
  deleteAccount: () => mockDeleteAccount(),
}));

const mockClearDraft = jest.fn();
jest.mock('@/features/intents/data/draft-store', () => ({
  clearDraft: () => mockClearDraft(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YouScreen = require('./app/(tabs)/you').default;

const profile = {
  displayName: 'Uma Rao',
  city: 'Bengaluru',
  isRestricted: false,
  verifiedKinds: [],
  reliability: [],
};

describe('YouScreen account deletion', () => {
  beforeEach(() => {
    mockFetchProfile.mockReset();
    mockDeleteAccount.mockReset();
    mockSignOut.mockReset();
    mockClearDraft.mockReset();
    mockFetchProfile.mockResolvedValue({ state: 'ok', data: profile });
  });

  it('requires a second, explicit confirmation before deleting', async () => {
    const user = userEvent.setup();

    await renderScreen(<YouScreen />);
    await waitFor(() => expect(screen.getByText('Uma Rao')).toBeTruthy());

    await user.press(screen.getByRole('button', { name: 'Delete account' }));

    expect(screen.getByTestId('delete-confirm')).toBeTruthy();
    expect(screen.getByText(/This cannot be undone/)).toBeTruthy();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('lets the person back out without deleting', async () => {
    const user = userEvent.setup();

    await renderScreen(<YouScreen />);
    await waitFor(() => expect(screen.getByText('Uma Rao')).toBeTruthy());

    await user.press(screen.getByRole('button', { name: 'Delete account' }));
    await user.press(screen.getByRole('button', { name: 'Keep my account' }));

    expect(screen.queryByTestId('delete-confirm')).toBeNull();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('deletes through the server function and signs out on success', async () => {
    mockDeleteAccount.mockResolvedValue({ ok: true });
    mockSignOut.mockResolvedValue(undefined);
    const user = userEvent.setup();

    await renderScreen(<YouScreen />);
    await waitFor(() => expect(screen.getByText('Uma Rao')).toBeTruthy());

    await user.press(screen.getByRole('button', { name: 'Delete account' }));
    await user.press(screen.getByRole('button', { name: 'Delete my account' }));

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledTimes(1));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockClearDraft).toHaveBeenCalledTimes(1);
  });

  it('keeps the account and shows the error when deletion fails', async () => {
    mockDeleteAccount.mockResolvedValue({
      ok: false,
      message: 'Your account could not be deleted right now. Try again.',
    });
    const user = userEvent.setup();

    await renderScreen(<YouScreen />);
    await waitFor(() => expect(screen.getByText('Uma Rao')).toBeTruthy());

    await user.press(screen.getByRole('button', { name: 'Delete account' }));
    await user.press(screen.getByRole('button', { name: 'Delete my account' }));

    await waitFor(() =>
      expect(
        screen.getByText('Your account could not be deleted right now. Try again.'),
      ).toBeTruthy(),
    );
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockClearDraft).not.toHaveBeenCalled();
  });
});
