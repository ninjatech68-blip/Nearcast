import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

import type { DeliveredIntent } from '@/features/intents/detail/domain/detail';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockFetch = jest.fn<() => Promise<DeliveredIntent | null>>();

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    push: (target: unknown) => mockPush(target),
  },
  useLocalSearchParams: () => ({ id: 'intent-9' }),
}));

jest.mock('expo-symbols', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');

  return {
    SymbolView: ({ fallback }: { fallback?: React.ReactNode }) => <Text>{fallback}</Text>,
  };
});

jest.mock('@/features/intents/detail/data/detail-repository', () => ({
  fetchDeliveredIntent: () => mockFetch(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const IntentDetailScreen = require('./app/intent/[id]').default;

const delivered = (overrides: Partial<DeliveredIntent> = {}): DeliveredIntent => ({
  deliveryId: 'delivery-9',
  intentId: 'intent-9',
  primitive: 'request',
  statement: 'Need two helpers to move a desk on Saturday morning',
  responseAction: 'Offer help',
  status: 'live',
  expiresAt: new Date(Date.now() + 86_400_000),
  startsAt: null,
  deadlineAt: null,
  quantity: null,
  priceMinor: null,
  currency: null,
  requirements: [],
  approximatePlace: 'Indiranagar',
  distanceBand: 'walking_distance',
  broadcasterFirstName: 'Asha',
  confirmationCount: 0,
  viewerHasConfirmed: false,
  reasonCode: 'adjacent_trust_connection',
  reasonText: 'Someone you both know shared this',
  isSaved: false,
  isHidden: false,
  myResponseStatus: null,
  ...overrides,
});

describe('Intent detail', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(delivered());
  });

  it('shows the intent that was asked for', async () => {
    const view = await render(<IntentDetailScreen />);

    expect(
      await view.findByText('Need two helpers to move a desk on Saturday morning'),
    ).toBeTruthy();
  });

  it('carries the stored explanation through from the card', async () => {
    const view = await render(<IntentDetailScreen />);

    await view.findByLabelText('Why you see this');
    expect(view.getByText('Someone you both know shared this')).toBeTruthy();
  });

  it('shows a coarse band, never a distance in metres', async () => {
    const view = await render(<IntentDetailScreen />);

    expect(await view.findByText('Walking distance')).toBeTruthy();
    expect(view.queryByText(/\bm\b|metre|meters/)).toBeNull();
  });

  it('responds against the real intent id, not a placeholder', async () => {
    // This is the regression the screen exists to prevent: it once pushed a
    // hardcoded slug, so no response could ever reach a real intent.
    const user = userEvent.setup();
    const view = await render(<IntentDetailScreen />);

    await user.press(await view.findByRole('button', { name: 'Offer help' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/request/[id]',
      params: { id: 'intent-9', firstName: 'Asha' },
    });
  });

  it('uses the broadcaster’s own wording for the action', async () => {
    mockFetch.mockResolvedValue(delivered({ responseAction: 'Ask for a seat' }));

    const view = await render(<IntentDetailScreen />);

    expect(await view.findByRole('button', { name: 'Ask for a seat' })).toBeTruthy();
  });

  it('offers no name when the broadcaster chose not to show one', async () => {
    mockFetch.mockResolvedValue(delivered({ broadcasterFirstName: null }));

    const view = await render(<IntentDetailScreen />);

    expect(await view.findByText('Someone nearby')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('reports an existing response instead of offering another', async () => {
    mockFetch.mockResolvedValue(delivered({ myResponseStatus: 'pending' }));

    const view = await render(<IntentDetailScreen />);

    expect(
      await view.findByText('You responded. Waiting for their decision.'),
    ).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Offer help' })).toBeNull();
  });

  it('closes the action once the intent has expired', async () => {
    mockFetch.mockResolvedValue(
      delivered({ expiresAt: new Date(Date.now() - 1000) }),
    );

    const view = await render(<IntentDetailScreen />);

    expect(await view.findByText('This expired')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Offer help' })).toBeNull();
  });

  it('stops offering the action on a card you hid', async () => {
    mockFetch.mockResolvedValue(delivered({ isHidden: true }));

    const view = await render(<IntentDetailScreen />);

    expect(await view.findByText('You hid this')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Offer help' })).toBeNull();
  });

  it('says an undelivered intent is unavailable rather than showing an error', async () => {
    mockFetch.mockResolvedValue(null);

    const view = await render(<IntentDetailScreen />);

    expect(await view.findByText(/not available to you/)).toBeTruthy();
  });

  it('offers a retry when the load actually failed', async () => {
    mockFetch.mockRejectedValue(new Error('offline'));

    const view = await render(<IntentDetailScreen />);

    expect(await view.findByText(/could not load this/)).toBeTruthy();
  });

  it('states confirmations honestly when there are none', async () => {
    const view = await render(<IntentDetailScreen />);

    await view.findByLabelText('Confirmation status');
    expect(view.getByText('No one has confirmed this yet')).toBeTruthy();
  });
});
