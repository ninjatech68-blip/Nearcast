import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen, userEvent, waitFor } from '@testing-library/react-native';

import { renderScreen } from './test-utils';

const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), replace: (...a: unknown[]) => mockReplace(...a), push: jest.fn() },
  useLocalSearchParams: () => ({ intentId: 'intent-1' }),
}));

jest.mock('@/features/auth/session', () => ({
  useSession: () => ({ status: 'signed-in', hasProfile: true, userId: 'uma' }),
}));

const mockFetchInbox = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockDecide = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('@/features/coordination/queries', () => ({
  fetchInbox: (...a: unknown[]) => mockFetchInbox(...a),
  decideResponse: (...a: unknown[]) => mockDecide(...a),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const InboxScreen = require('./app/inbox/[intentId]').default;

function entry(overrides: Record<string, unknown> = {}) {
  return {
    responseId: 'resp-1',
    respondentId: 'vikram',
    respondentName: 'Vikram Iyer',
    message: 'I play most evenings, happy to join',
    qualification: { level: 'intermediate' },
    status: 'pending',
    reliabilityLine: '8 of 9 confirmed interactions were completed',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('InboxScreen', () => {
  beforeEach(() => {
    mockFetchInbox.mockReset();
    mockDecide.mockReset();
    mockReplace.mockReset();
  });

  it('shows the respondent with contextual trust evidence, never a score', async () => {
    mockFetchInbox.mockResolvedValue({ state: 'ok', data: [entry()] });

    await renderScreen(<InboxScreen />);

    await waitFor(() => expect(screen.getByText('Vikram Iyer')).toBeTruthy());
    expect(screen.getByText('8 of 9 confirmed interactions were completed')).toBeTruthy();
    expect(screen.getByText(/level: intermediate/)).toBeTruthy();
    expect(screen.queryByText(/Trust \d/)).toBeNull();
  });

  it('accepting calls the server decision and routes back to the intent', async () => {
    mockFetchInbox.mockResolvedValue({ state: 'ok', data: [entry()] });
    mockDecide.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    await renderScreen(<InboxScreen />);
    await waitFor(() => expect(screen.getByText('Vikram Iyer')).toBeTruthy());

    await user.press(screen.getByRole('button', { name: 'Accept response' }));

    await waitFor(() => expect(mockDecide).toHaveBeenCalledWith('resp-1', 'accept'));
    expect(mockReplace).toHaveBeenCalledWith('/intent/intent-1');
  });

  it('a declined response shows a neutral status with no private reasoning', async () => {
    mockFetchInbox.mockResolvedValue({ state: 'ok', data: [entry({ status: 'declined' })] });

    await renderScreen(<InboxScreen />);

    await waitFor(() => expect(screen.getByText('Declined')).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Accept response' })).toBeNull();
  });

  it('states an empty inbox honestly with the approved copy', async () => {
    mockFetchInbox.mockResolvedValue({ state: 'ok', data: [] });

    await renderScreen(<InboxScreen />);

    await waitFor(() => expect(screen.getByText('No relevant responses yet')).toBeTruthy());
    expect(screen.getByText('You can wait, edit the intent, or expand its reach.')).toBeTruthy();
  });
});
