import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from './test-utils';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'intent-1' }),
}));

jest.mock('@/features/auth/session', () => ({
  useSession: () => ({ status: 'signed-in', hasProfile: true, userId: 'uma' }),
}));

const mockFetchDetail = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockFetchEdits = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('@/features/intents/data/intent-queries', () => ({
  fetchIntentDetail: (...a: unknown[]) => mockFetchDetail(...a),
  fetchMaterialEdits: (...a: unknown[]) => mockFetchEdits(...a),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const IntentDetailScreen = require('./app/intent/[id]').default;

function detail(overrides: Record<string, unknown> = {}) {
  return {
    id: 'intent-1',
    primitiveLabel: 'I need',
    statement: 'Need a table for six on Friday',
    status: 'live',
    approximatePlace: 'Koramangala',
    startsAt: null,
    deadlineAt: null,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    reasonText: 'Shared through one trusted connection',
    responseAction: 'Offer help',
    confirmationCount: 1,
    broadcasterFirstName: 'Bela',
    isOwn: false,
    matchId: null,
    responseCount: 0,
    ...overrides,
  };
}

describe('IntentDetailScreen material edits', () => {
  beforeEach(() => {
    mockFetchDetail.mockReset();
    mockFetchEdits.mockReset();
    mockFetchEdits.mockResolvedValue({ state: 'ok', data: [] });
  });

  it('tells a respondent what changed after they responded', async () => {
    mockFetchDetail.mockResolvedValue({ state: 'ok', data: detail() });
    mockFetchEdits.mockResolvedValue({
      state: 'ok',
      data: [
        {
          id: 2,
          description: 'The price changed after you responded.',
          changedAt: new Date().toISOString(),
        },
      ],
    });

    await renderScreen(<IntentDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('material-edits')).toBeTruthy());
    expect(screen.getByText('The price changed after you responded.')).toBeTruthy();
  });

  it('shows no history block when the intent has not been edited', async () => {
    mockFetchDetail.mockResolvedValue({ state: 'ok', data: detail() });

    await renderScreen(<IntentDetailScreen />);

    await waitFor(() =>
      expect(screen.getByText('Need a table for six on Friday')).toBeTruthy(),
    );
    expect(screen.queryByTestId('material-edits')).toBeNull();
  });

  it('offers the edit action to the owner while the intent is still live', async () => {
    mockFetchDetail.mockResolvedValue({ state: 'ok', data: detail({ isOwn: true }) });

    await renderScreen(<IntentDetailScreen />);

    await waitFor(() => expect(screen.getByText('Edit intent')).toBeTruthy());
  });

  it('withdraws the edit action once coordination has started', async () => {
    mockFetchDetail.mockResolvedValue({
      state: 'ok',
      data: detail({ isOwn: true, status: 'matched' }),
    });

    await renderScreen(<IntentDetailScreen />);

    await waitFor(() =>
      expect(screen.getByText('Resolve or withdraw intent')).toBeTruthy(),
    );
    expect(screen.queryByText('Edit intent')).toBeNull();
  });

  it('never offers the edit action to someone who does not own the intent', async () => {
    mockFetchDetail.mockResolvedValue({ state: 'ok', data: detail() });

    await renderScreen(<IntentDetailScreen />);

    await waitFor(() =>
      expect(screen.getByText('Need a table for six on Friday')).toBeTruthy(),
    );
    expect(screen.queryByText('Edit intent')).toBeNull();
  });
});
