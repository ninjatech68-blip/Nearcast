import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

import type { OwnerIntent } from '@/features/intents/manage/data/owner-intents-repository';

const mockPush = jest.fn();
const mockFetch = jest.fn<() => Promise<OwnerIntent[]>>();
const mockWithdraw = jest.fn<(id: string, version: number) => Promise<unknown>>();
const mockResolve = jest.fn<(id: string, version: number) => Promise<unknown>>();

jest.mock('expo-router', () => ({
  router: { push: (href: string) => mockPush(href) },
}));

jest.mock('@/infrastructure/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
  },
}));

jest.mock('@/features/intents/manage/data/owner-intents-repository', () => ({
  fetchOwnerIntents: () => mockFetch(),
  withdrawIntent: (id: string, version: number) => mockWithdraw(id, version),
  resolveIntent: (id: string, version: number) => mockResolve(id, version),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BroadcastTab = require('./app/(tabs)/broadcast').default;

const intent = (overrides: Partial<OwnerIntent> = {}): OwnerIntent => ({
  id: 'intent-1',
  statement: 'Need two helpers for Saturday',
  status: 'live',
  version: 3,
  expiresAt: new Date('2099-01-01T00:00:00.000Z'),
  shareSlug: 'slug-1',
  ...overrides,
});

describe('My intents', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetch.mockReset();
    mockWithdraw.mockReset();
    mockResolve.mockReset();
    mockFetch.mockResolvedValue([intent()]);
  });

  it('lists a live intent with the actions its state permits', async () => {
    const view = await render(<BroadcastTab />);

    expect(await view.findByText('Need two helpers for Saturday')).toBeTruthy();
    expect(view.getByText('Live and accepting responses')).toBeTruthy();
    expect(view.getByLabelText('Withdraw')).toBeTruthy();
    expect(view.getByLabelText('Mark resolved')).toBeTruthy();
  });

  it('does not offer edit or withdraw on a closed intent', async () => {
    mockFetch.mockResolvedValue([intent({ status: 'withdrawn' })]);
    const view = await render(<BroadcastTab />);

    expect(await view.findByText('Withdrawn, no longer accepting responses')).toBeTruthy();
    expect(view.queryByLabelText('Withdraw')).toBeNull();
    expect(view.queryByLabelText('Edit')).toBeNull();
    expect(view.getByLabelText('Duplicate')).toBeTruthy();
  });

  it('offers nothing actionable on an intent under review', async () => {
    mockFetch.mockResolvedValue([intent({ status: 'restricted' })]);
    const view = await render(<BroadcastTab />);

    expect(await view.findByText('Under review')).toBeTruthy();
    expect(view.queryByLabelText('Withdraw')).toBeNull();
    expect(view.queryByLabelText('Duplicate')).toBeNull();
  });

  it('withdraws using the version it read, and shows the new state', async () => {
    const user = userEvent.setup();
    mockWithdraw.mockResolvedValue({ status: 'withdrawn', version: 4 });
    const view = await render(<BroadcastTab />);

    await user.press(await view.findByLabelText('Withdraw'));

    expect(mockWithdraw).toHaveBeenCalledWith('intent-1', 3);
    expect(
      await view.findByText('Withdrawn, no longer accepting responses'),
    ).toBeTruthy();
  });

  it('reloads and explains when the intent changed somewhere else', async () => {
    const user = userEvent.setup();
    mockWithdraw.mockRejectedValue(new Error('stale_state'));
    const view = await render(<BroadcastTab />);

    await user.press(await view.findByLabelText('Withdraw'));

    expect(await view.findByText(/changed somewhere else/)).toBeTruthy();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('explains the empty state without inventing an intent', async () => {
    mockFetch.mockResolvedValue([]);
    const view = await render(<BroadcastTab />);

    expect(await view.findByText(/have not broadcast anything yet/)).toBeTruthy();
  });

  it('offers a retry when the list cannot be loaded', async () => {
    mockFetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([intent()]);
    const user = userEvent.setup();
    const view = await render(<BroadcastTab />);

    await user.press(await view.findByLabelText('Try loading your intents again'));

    expect(await view.findByText('Need two helpers for Saturday')).toBeTruthy();
  });
});
