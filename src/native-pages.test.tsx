import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from './test-utils';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockPush(...args),
  },
  useLocalSearchParams: () => ({ id: 'intent-1', shareSlug: 'slug-1', token: 'tok' }),
}));

const mockUseSession = jest.fn<() => unknown>();
jest.mock('@/features/auth/session', () => ({ useSession: () => mockUseSession() }));

const mockFetchDetail = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockFetchFeed = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('@/features/intents/data/intent-queries', () => ({
  fetchIntentDetail: (...a: unknown[]) => mockFetchDetail(...a),
  fetchFeed: (...a: unknown[]) => mockFetchFeed(...a),
  PRIMITIVE_LABELS: { request: 'I need', offer: 'I offer', plan: 'I want to' },
}));

const mockFetchActivity = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockFetchProfile = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('@/features/intents/data/activity-queries', () => ({
  fetchActivity: (...a: unknown[]) => mockFetchActivity(...a),
  fetchProfileSummary: (...a: unknown[]) => mockFetchProfile(...a),
  describeReliability: () => '8 of 9 confirmed interactions were completed',
  submitResponse: jest.fn(),
  STATUS_LABELS: {},
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const IntentDetailScreen = require('./app/intent/[id]').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BroadcasterProfileScreen = require('./app/profile/[id]').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ActivityScreen = require('./app/(tabs)/activity').default;

const signedIn = { status: 'signed-in', hasProfile: true, userId: 'user-1' };

describe('native page set', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockUseSession.mockReset();
    mockUseSession.mockReturnValue(signedIn);
    mockFetchDetail.mockReset();
    mockFetchActivity.mockReset();
    mockFetchProfile.mockReset();
  });

  it('shows the delivery reason on intent detail', async () => {
    mockFetchDetail.mockResolvedValue({
      state: 'ok',
      data: {
        id: 'intent-1',
        primitiveLabel: 'I need',
        statement: 'Need one person to help sort books',
        approximatePlace: 'Indiranagar',
        startsAt: null,
        deadlineAt: null,
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        reasonText: 'Shared through one trusted connection',
        responseAction: 'Offer help',
        confirmationCount: 2,
        broadcasterFirstName: 'Asha',
        isOwn: false,
      },
    });

    await renderScreen(<IntentDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Need one person to help sort books')).toBeTruthy();
    });
    expect(screen.getByText('Why you are seeing this')).toBeTruthy();
    expect(screen.getByText('Confirmed by 2 people at the origin.')).toBeTruthy();
  });

  it('hides an intent the viewer may not read behind a neutral message', async () => {
    mockFetchDetail.mockResolvedValue({ state: 'ok', data: null });

    await renderScreen(<IntentDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('This information is not available to you.')).toBeTruthy();
    });
  });

  it('never renders a numeric trust score on a broadcaster profile', async () => {
    mockFetchProfile.mockResolvedValue({
      state: 'ok',
      data: {
        displayName: 'Asha Rao',
        city: 'Bengaluru',
        isRestricted: false,
        verifiedKinds: ['phone'],
        reliability: [{ context: 'I need', completed: 8, confirmed: 9 }],
      },
    });

    await renderScreen(<BroadcasterProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('Asha Rao')).toBeTruthy();
    });
    expect(screen.getByText(/8 of 9 confirmed interactions were completed/)).toBeTruthy();
    expect(screen.queryByText(/Trust \d/)).toBeNull();
  });

  it('states an empty activity list honestly', async () => {
    mockFetchActivity.mockResolvedValue({
      state: 'ok',
      data: { owned: [], respondedCount: 0, matchCount: 0 },
    });

    await renderScreen(<ActivityScreen />);

    await waitFor(() => {
      expect(screen.getByText('You have not broadcast anything yet')).toBeTruthy();
    });
  });

  it('offers recovery when activity cannot load', async () => {
    mockFetchActivity.mockResolvedValue({ state: 'error', message: 'Check your connection.' });

    await renderScreen(<ActivityScreen />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    });
  });
});
