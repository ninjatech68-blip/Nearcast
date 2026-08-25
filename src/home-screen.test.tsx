import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from './test-utils';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

const mockUseSession = jest.fn<() => unknown>();
jest.mock('@/features/auth/session', () => ({
  useSession: () => mockUseSession(),
}));

const mockFetchFeed = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('@/features/intents/data/intent-queries', () => ({
  fetchFeed: (...args: unknown[]) => mockFetchFeed(...args),
  PRIMITIVE_LABELS: { request: 'I need', offer: 'I offer', plan: 'I want to' },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HomeScreen = require('./app/(tabs)/index').default;

const signedIn = { status: 'signed-in', hasProfile: true };

function card(overrides: Record<string, unknown> = {}) {
  return {
    id: 'intent-1',
    primitiveLabel: 'I need',
    statement: 'Need one person to help sort books',
    approximatePlace: 'Indiranagar',
    expiresAt: new Date(Date.now() + 7_200_000).toISOString(),
    reasonText: 'Shared through one trusted connection',
    responseAction: 'Offer help',
    confirmationCount: 3,
    ...overrides,
  };
}

describe('HomeScreen', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockUseSession.mockReset();
    mockFetchFeed.mockReset();
  });

  it('asks an unauthenticated visitor to sign in rather than showing an empty feed', async () => {
    mockUseSession.mockReturnValue({ status: 'signed-out', hasProfile: false });

    await renderScreen(<HomeScreen />);

    expect(screen.getByText(/Sign in with your invitation/)).toBeTruthy();
    expect(mockFetchFeed).not.toHaveBeenCalled();
  });

  it('renders each delivered intent with its stored delivery reason', async () => {
    mockUseSession.mockReturnValue(signedIn);
    mockFetchFeed.mockResolvedValue({ state: 'ok', data: [card()] });

    await renderScreen(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText('Need one person to help sort books')).toBeTruthy();
    });
    expect(
      screen.getByText('Why you are seeing this: Shared through one trusted connection'),
    ).toBeTruthy();
    expect(screen.getByText('Confirmed by 3 people at the origin')).toBeTruthy();
  });

  it('states an empty feed honestly instead of inventing activity', async () => {
    mockUseSession.mockReturnValue(signedIn);
    mockFetchFeed.mockResolvedValue({ state: 'ok', data: [] });

    await renderScreen(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText('Nothing relevant is active right now')).toBeTruthy();
    });
  });

  it('offers recovery when the feed cannot load', async () => {
    mockUseSession.mockReturnValue(signedIn);
    mockFetchFeed.mockResolvedValue({ state: 'error', message: 'Check your connection.' });

    await renderScreen(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('never shows a confirmation count when there are no confirmations', async () => {
    mockUseSession.mockReturnValue(signedIn);
    mockFetchFeed.mockResolvedValue({ state: 'ok', data: [card({ confirmationCount: 0 })] });

    await renderScreen(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText('Need one person to help sort books')).toBeTruthy();
    });
    expect(screen.queryByText(/Confirmed by/)).toBeNull();
  });
});
