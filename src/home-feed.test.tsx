import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

import type { FeedCard } from '@/features/feed/data/feed-repository';

const mockPush = jest.fn();
const mockFetch = jest.fn<() => Promise<FeedCard[]>>();
const mockHide = jest.fn<(id: string) => Promise<void>>();
const mockNotRelevant = jest.fn<(id: string) => Promise<void>>();
const mockSetSaved = jest.fn<(id: string, saved: boolean) => Promise<void>>();

jest.mock('expo-router', () => ({
  router: { push: (href: string) => mockPush(href) },
}));

jest.mock('@/features/feed/data/feed-repository', () => ({
  fetchHomeFeed: () => mockFetch(),
  hideDelivery: (id: string) => mockHide(id),
  markNotRelevant: (id: string) => mockNotRelevant(id),
  setSaved: (id: string, saved: boolean) => mockSetSaved(id, saved),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HomeScreen = require('./app/(tabs)/index').default;

const card = (overrides: Partial<FeedCard> = {}): FeedCard => ({
  deliveryId: 'delivery-1',
  intentId: 'intent-1',
  statement: 'Need two helpers for Saturday',
  responseAction: 'Offer help',
  approximatePlace: 'Indiranagar',
  distanceBand: 'walking_distance',
  broadcasterFirstName: 'Asha',
  reasonCode: 'adjacent_trust_connection',
  reasonText: 'Someone you both know shared this',
  isSaved: false,
  ...overrides,
});

describe('Home feed', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetch.mockReset();
    mockHide.mockReset();
    mockNotRelevant.mockReset();
    mockSetSaved.mockReset();
    mockFetch.mockResolvedValue([card()]);
  });

  it('shows every card with its stored explanation', async () => {
    const view = await render(<HomeScreen />);

    expect(await view.findByText('Need two helpers for Saturday')).toBeTruthy();
    expect(view.getByLabelText('Why you see this')).toBeTruthy();
    expect(view.getByText('Someone you both know shared this')).toBeTruthy();
  });

  it('shows a coarse band, never a distance in metres', async () => {
    const view = await render(<HomeScreen />);

    await view.findByText('Need two helpers for Saturday');
    expect(view.getByText(/Walking distance/)).toBeTruthy();
    expect(view.queryByText(/\d+\s*(m|km|metre)/i)).toBeNull();
  });

  it('opens the intent when the card is pressed', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(
      await view.findByLabelText('Open intent: Need two helpers for Saturday'),
    );

    expect(mockPush).toHaveBeenCalledWith('/intent/intent-1');
  });

  it('offers hide, save and not relevant, and acts on the delivery', async () => {
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(
      await view.findByLabelText('Not relevant: Need two helpers for Saturday'),
    );
    expect(mockNotRelevant).toHaveBeenCalledWith('delivery-1');

    await user.press(view.getByLabelText('Hide: Need two helpers for Saturday'));
    expect(mockHide).toHaveBeenCalledWith('delivery-1');

    await user.press(view.getByLabelText('Save: Need two helpers for Saturday'));
    expect(mockSetSaved).toHaveBeenCalledWith('delivery-1', true);
  });

  it('ends the list rather than implying more, and shows no activity count', async () => {
    const view = await render(<HomeScreen />);

    expect(await view.findByText('That is everything for now.')).toBeTruthy();
    expect(view.queryByText(/\d+ (people|others|viewing|nearby now)/i)).toBeNull();
  });

  it('says plainly when nothing has reached the viewer', async () => {
    mockFetch.mockResolvedValue([]);
    const view = await render(<HomeScreen />);

    expect(await view.findByText(/Nothing right now/)).toBeTruthy();
    expect(view.queryByText('That is everything for now.')).toBeNull();
  });

  it('offers a retry when the feed cannot be loaded', async () => {
    mockFetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([card()]);
    const user = userEvent.setup();
    const view = await render(<HomeScreen />);

    await user.press(await view.findByLabelText('Try loading your feed again'));

    expect(await view.findByText('Need two helpers for Saturday')).toBeTruthy();
  });
});
