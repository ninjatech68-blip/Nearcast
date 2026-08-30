import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

import type { InboxResponse } from '@/features/responses/inbox/data/inbox-repository';

const mockPush = jest.fn();
const mockFetch = jest.fn<() => Promise<InboxResponse[]>>();
const mockAccept = jest.fn<(id: string, status: string) => Promise<unknown>>();
const mockDecline = jest.fn<(id: string, status: string) => Promise<unknown>>();

jest.mock('expo-router', () => ({
  router: { push: (href: string) => mockPush(href) },
}));

jest.mock('@/features/responses/inbox/data/inbox-repository', () => ({
  fetchInbox: () => mockFetch(),
  acceptResponse: (id: string, status: string) => mockAccept(id, status),
  declineResponse: (id: string, status: string) => mockDecline(id, status),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ActivityScreen = require('./app/(tabs)/activity').default;

const response = (overrides: Partial<InboxResponse> = {}): InboxResponse => ({
  id: 'response-1',
  intentId: 'intent-1',
  intentStatement: 'Need two helpers for Saturday',
  intentStatus: 'live',
  respondentFirstName: 'Dev',
  message: 'Happy to help',
  qualification: { has_transport: true },
  status: 'pending',
  ...overrides,
});

describe('Broadcaster inbox', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetch.mockReset();
    mockAccept.mockReset();
    mockDecline.mockReset();
    mockFetch.mockResolvedValue([response()]);
  });

  it('shows a pending response with both decisions', async () => {
    const view = await render(<ActivityScreen />);

    expect(await view.findByText('Happy to help')).toBeTruthy();
    expect(view.getByText('Dev')).toBeTruthy();
    expect(view.getByText('Waiting for your decision')).toBeTruthy();
    expect(view.getByLabelText('Accept Dev')).toBeTruthy();
    expect(view.getByLabelText('Decline Dev')).toBeTruthy();
  });

  it('renders only the claims the respondent actually made', async () => {
    const view = await render(<ActivityScreen />);

    expect(await view.findByText('I have transport')).toBeTruthy();
    expect(view.queryByText('I can travel to them')).toBeNull();
  });

  it('never ranks or scores the responses', async () => {
    mockFetch.mockResolvedValue([
      response(),
      response({ id: 'response-2', respondentFirstName: 'Mira' }),
    ]);
    const view = await render(<ActivityScreen />);

    await view.findByText('Dev');
    expect(view.queryByText(/best match|top pick|score|%/i)).toBeNull();
  });

  it('accepts using the intent status it read', async () => {
    const user = userEvent.setup();
    mockAccept.mockResolvedValue({ matchId: 'match-1' });
    const view = await render(<ActivityScreen />);

    await user.press(await view.findByLabelText('Accept Dev'));

    expect(mockAccept).toHaveBeenCalledWith('response-1', 'live');
    expect(await view.findByText(/coordination room is open/)).toBeTruthy();
  });

  it('declines without offering a reason field', async () => {
    const user = userEvent.setup();
    mockDecline.mockResolvedValue({ status: 'declined' });
    const view = await render(<ActivityScreen />);

    await user.press(await view.findByLabelText('Decline Dev'));

    expect(mockDecline).toHaveBeenCalledWith('response-1', 'pending');
    expect(view.queryByLabelText(/reason/i)).toBeNull();
  });

  it('stops offering accept once the intent is already matched', async () => {
    mockFetch.mockResolvedValue([response({ intentStatus: 'matched' })]);
    const view = await render(<ActivityScreen />);

    await view.findByText('Happy to help');
    expect(view.queryByLabelText('Accept Dev')).toBeNull();
    expect(view.getByLabelText('Decline Dev')).toBeTruthy();
  });

  it('offers the room once a response is accepted', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue([response({ status: 'accepted' })]);
    const view = await render(<ActivityScreen />);

    expect(await view.findByText('Accepted, coordination open')).toBeTruthy();
    await user.press(view.getByLabelText('Open messages'));
    expect(mockPush).toHaveBeenCalledWith('/messages');
  });

  it('reloads and explains when a response changed elsewhere', async () => {
    const user = userEvent.setup();
    mockAccept.mockRejectedValue(new Error('stale_intent_state'));
    const view = await render(<ActivityScreen />);

    await user.press(await view.findByLabelText('Accept Dev'));

    expect(await view.findByText(/changed somewhere else/)).toBeTruthy();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('explains the empty inbox without inventing a response', async () => {
    mockFetch.mockResolvedValue([]);
    const view = await render(<ActivityScreen />);

    expect(await view.findByText(/No responses yet/)).toBeTruthy();
  });
});
