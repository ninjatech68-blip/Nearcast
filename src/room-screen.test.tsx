import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen, userEvent, waitFor } from '@testing-library/react-native';

import { renderScreen } from './test-utils';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ matchId: 'match-1' }),
}));

jest.mock('@/features/auth/session', () => ({
  useSession: () => ({ status: 'signed-in', hasProfile: true, userId: 'uma' }),
}));

const mockFetchRoom = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockSend = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockRelease = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('@/features/coordination/queries', () => ({
  fetchRoom: (...a: unknown[]) => mockFetchRoom(...a),
  sendRoomMessage: (...a: unknown[]) => mockSend(...a),
  releaseField: (...a: unknown[]) => mockRelease(...a),
  blockUser: jest.fn(),
  reportUser: jest.fn(),
  RELEASABLE_FIELDS: [
    { fieldName: 'exact_address', label: 'Share exact address' },
    { fieldName: 'private_contact', label: 'Share contact details' },
    { fieldName: 'coordination_notes', label: 'Share coordination notes' },
  ],
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RoomScreen = require('./app/room/[matchId]').default;

function room(overrides: Record<string, unknown> = {}) {
  return {
    matchId: 'match-1',
    conversationId: 'conv-1',
    closed: false,
    isBroadcaster: true,
    counterpartId: 'vikram',
    counterpartName: 'Vikram Iyer',
    intentId: 'intent-1',
    intentStatement: 'Need one person for badminton this evening',
    intentStatus: 'matched',
    messages: [
      { id: 'm1', body: 'See you at 7', isMine: false, isSystem: false, createdAt: '' },
    ],
    released: [],
    ...overrides,
  };
}

describe('RoomScreen', () => {
  beforeEach(() => {
    mockFetchRoom.mockReset();
    mockSend.mockReset();
    mockRelease.mockReset();
  });

  it('pins the governing intent and its status at the top of the room', async () => {
    mockFetchRoom.mockResolvedValue({ state: 'ok', data: room() });

    await renderScreen(<RoomScreen />);

    await waitFor(() => expect(screen.getByTestId('intent-status-header')).toBeTruthy());
    expect(screen.getByText('Need one person for badminton this evening')).toBeTruthy();
    expect(screen.getByText(/Matched/)).toBeTruthy();
    expect(screen.getByText('See you at 7')).toBeTruthy();
  });

  it('keeps block and report one tap away', async () => {
    mockFetchRoom.mockResolvedValue({ state: 'ok', data: room() });

    await renderScreen(<RoomScreen />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Block' })).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Report' })).toBeTruthy();
  });

  it('offers release actions to the broadcaster only for unreleased fields', async () => {
    mockFetchRoom.mockResolvedValue({
      state: 'ok',
      data: room({
        released: [{ fieldName: 'exact_address', fieldValue: 'Court 2, 44 Play Lane' }],
      }),
    });

    await renderScreen(<RoomScreen />);

    await waitFor(() => expect(screen.getByTestId('released-fields')).toBeTruthy());
    expect(screen.getByText(/Court 2, 44 Play Lane/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Share exact address' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Share contact details' })).toBeTruthy();
  });

  it('never offers release actions to the participant', async () => {
    mockFetchRoom.mockResolvedValue({ state: 'ok', data: room({ isBroadcaster: false }) });

    await renderScreen(<RoomScreen />);

    await waitFor(() => expect(screen.getByTestId('intent-status-header')).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Share exact address' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Share contact details' })).toBeNull();
  });

  it('sends a message through the server function', async () => {
    mockFetchRoom.mockResolvedValue({ state: 'ok', data: room() });
    mockSend.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    await renderScreen(<RoomScreen />);
    await waitFor(() => expect(screen.getByLabelText('Message')).toBeTruthy());

    await user.type(screen.getByLabelText('Message'), 'On my way');
    await user.press(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(mockSend).toHaveBeenCalled());
    expect(mockSend.mock.calls[0]?.[0]).toBe('conv-1');
    expect(mockSend.mock.calls[0]?.[1]).toBe('On my way');
  });

  it('renders a closed room read-only', async () => {
    mockFetchRoom.mockResolvedValue({ state: 'ok', data: room({ closed: true }) });

    await renderScreen(<RoomScreen />);

    await waitFor(() =>
      expect(screen.getByText('This intent is closed, so the room is read-only.')).toBeTruthy(),
    );
    expect(screen.queryByLabelText('Message')).toBeNull();
  });
});
