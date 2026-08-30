import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';
import { Share } from 'react-native';

import type { PublicIntent } from '@/features/sharing/domain/public-intent';

const mockPush = jest.fn();
const mockShare = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
const mockConfirm = jest.fn<(slug: string) => Promise<unknown>>();
let mockIntent: PublicIntent | null = null;
let mockHasConfirmed = false;
let mockMembership = 'member';

jest.mock('expo-router', () => ({
  router: { push: (href: string) => mockPush(href) },
  useLocalSearchParams: () => ({ shareSlug: 'slug-1' }),
}));

jest.mock('@/features/auth/ui/session-provider', () => ({
  useSession: () => ({ membership: mockMembership, refresh: async () => undefined }),
}));

jest.mock('@/features/sharing/data/public-intent-repository', () => ({
  fetchPublicIntent: async () => mockIntent,
  fetchViewerHasConfirmed: async () => mockHasConfirmed,
  confirmIntent: (slug: string) => mockConfirm(slug),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PublicIntentScreen = require('./app/i/[shareSlug]').default;

const intent = (overrides: Partial<PublicIntent> = {}): PublicIntent => ({
  id: 'intent-1',
  shareSlug: 'slug-1',
  primitive: 'request',
  statement: 'Need two helpers for Saturday',
  responseAction: 'Offer help',
  expiresAt: '2099-01-01T00:00:00.000Z',
  publishedAt: '2026-08-30T10:00:00.000Z',
  startsAt: null,
  deadlineAt: null,
  quantity: null,
  priceMinor: null,
  currency: null,
  approximatePlace: 'Indiranagar',
  broadcasterFirstName: 'Asha',
  confirmationCount: 0,
  ...overrides,
});

describe('PublicIntentScreen', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockShare.mockClear();
    mockConfirm.mockReset();
    mockIntent = intent();
    mockHasConfirmed = false;
    mockMembership = 'member';
  });

  it('shows the public intent to an anonymous reader without asking them to sign in first', async () => {
    mockMembership = 'signed_out';
    const view = await render(<PublicIntentScreen />);

    expect(await view.findByText('Need two helpers for Saturday')).toBeTruthy();
    expect(view.getByText('Around Indiranagar')).toBeTruthy();
    expect(view.getByText('Asha nearby')).toBeTruthy();
  });

  it('offers sign-in rather than a confirm control an anonymous reader cannot use', async () => {
    mockMembership = 'signed_out';
    const view = await render(<PublicIntentScreen />);

    expect(await view.findByRole('button', { name: 'Sign in to Nearcast' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Confirm this is genuine' })).toBeNull();
  });

  it('reports zero confirmations honestly', async () => {
    const view = await render(<PublicIntentScreen />);

    expect(await view.findByText('No one has confirmed this yet')).toBeTruthy();
  });

  it('confirms once and reports the new count', async () => {
    const user = userEvent.setup();
    mockConfirm.mockResolvedValue({ confirmationCount: 3, viewerHasConfirmed: true });
    const view = await render(<PublicIntentScreen />);

    await user.press(
      await view.findByRole('button', { name: 'Confirm this is genuine' }),
    );

    expect(mockConfirm).toHaveBeenCalledWith('slug-1');
    expect(await view.findByText('You and 2 other people confirmed this')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Confirm this is genuine' })).toBeNull();
  });

  it('does not offer to confirm again once the viewer has', async () => {
    mockHasConfirmed = true;
    mockIntent = intent({ confirmationCount: 1 });
    const view = await render(<PublicIntentScreen />);

    expect(await view.findByText('You confirmed this')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Confirm this is genuine' })).toBeNull();
  });

  it('shares the statement and link, never the place or the count', async () => {
    const user = userEvent.setup();
    mockIntent = intent({ confirmationCount: 12 });
    const view = await render(<PublicIntentScreen />);

    await user.press(await view.findByLabelText('Share'));

    const shared = mockShare.mock.calls[0]?.[0] as { message: string; url: string };
    expect(shared.url).toBe('https://nearcast.app/i/slug-1');
    expect(shared.message).toContain('Need two helpers for Saturday');
    expect(shared.message).not.toContain('Indiranagar');
    expect(shared.message).not.toContain('12');
  });

  it('explains a withdrawn or expired link without confirming the intent existed', async () => {
    mockIntent = null;
    const view = await render(<PublicIntentScreen />);

    expect(await view.findByText('This intent is no longer available')).toBeTruthy();
  });

  it('closes an expired intent to confirmation', async () => {
    mockIntent = intent({ expiresAt: '2020-01-01T00:00:00.000Z' });
    const view = await render(<PublicIntentScreen />);

    expect(await view.findByText('This intent has expired.')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Confirm this is genuine' })).toBeNull();
  });
});
