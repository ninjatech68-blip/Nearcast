import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, userEvent, within } from '@testing-library/react-native';

import { DRAFT_STORAGE_KEY } from '@/features/intents/create/domain/draft-storage';

const store: Record<string, string> = {};

const mockReplace = jest.fn();
const mockPublish = jest.fn<(request: unknown) => Promise<unknown>>();

jest.mock('expo-router', () => ({
  router: {
    back: () => undefined,
    push: () => undefined,
    replace: (href: string) => mockReplace(href),
  },
}));

jest.mock('@/features/intents/data/publish-intent', () => ({
  publishIntent: (request: unknown) => mockPublish(request),
}));

jest.mock('@/features/location/data/places-repository', () => ({
  fetchPlaces: async () => [
    { id: 'place-1', name: 'Indiranagar', region: 'Bengaluru' },
    { id: 'place-2', name: 'Koramangala', region: 'Bengaluru' },
  ],
}));

jest.mock('@/features/intents/create/data/device-draft-store', () => ({
  deviceDraftStore: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PreviewIntentScreen = require('./app/preview').default;

function seedDraft(overrides: {
  publicDraft?: Record<string, unknown>;
  privateDraft?: Record<string, unknown>;
} = {}) {
  store[DRAFT_STORAGE_KEY] = JSON.stringify({
    publicDraft: {
      primitive: 'request',
      statement: 'Need two helpers for Saturday',
      responseAction: 'Offer help',
      expiresAt: '2099-01-01T00:00:00.000Z',
      startsAt: null,
      deadlineAt: null,
      quantity: null,
      priceMinor: null,
      currency: null,
      approximatePlaceId: null,
      approximatePlaceName: null,
      requirements: [],
      ...overrides.publicDraft,
    },
    privateDraft: {
      exactAddress: null,
      privateContact: null,
      coordinationNotes: null,
      ...overrides.privateDraft,
    },
    updatedAt: '2026-08-30T12:00:00.000Z',
  });
}

describe('PreviewIntentScreen', () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    mockReplace.mockReset();
    mockPublish.mockReset();
  });

  it('states that nothing is visible while the draft is still local', async () => {
    seedDraft();
    const view = await render(<PreviewIntentScreen />);

    expect(
      view.getByText('Nothing yet. This draft is only on your device.'),
    ).toBeTruthy();
  });

  it('shows the public context that publishing would reveal', async () => {
    seedDraft({ publicDraft: { approximatePlaceId: 'place-1', approximatePlaceName: 'Indiranagar' } });
    const view = await render(<PreviewIntentScreen />);
    const disclosure = within(view.getByLabelText('What others can see'));

    expect(disclosure.getByText('Visible after you publish')).toBeTruthy();
    expect(disclosure.getByText('Need two helpers for Saturday')).toBeTruthy();
    expect(disclosure.getByText('Approximate area')).toBeTruthy();
    expect(disclosure.getByText('Indiranagar')).toBeTruthy();
  });

  it('never shows a private value in the disclosure, only that it is held back', async () => {
    seedDraft({
      privateDraft: { exactAddress: '42 Private Lane', privateContact: '+910000000000' },
    });
    const view = await render(<PreviewIntentScreen />);

    const node = view.getByLabelText('What others can see');
    const disclosure = within(node);

    expect(disclosure.getByText('Stays private')).toBeTruthy();
    expect(disclosure.getByText('Exact address')).toBeTruthy();
    expect(node).not.toHaveTextContent('42 Private Lane');
    expect(node).not.toHaveTextContent('+910000000000');
  });

  it('holds nothing back when no private details were entered', async () => {
    seedDraft();
    const view = await render(<PreviewIntentScreen />);

    expect(view.queryByText('Stays private')).toBeNull();
  });

  it('blocks publishing and lists what is missing', async () => {
    seedDraft({ publicDraft: { responseAction: '' } });
    const view = await render(<PreviewIntentScreen />);

    expect(
      view.getByRole('button', { name: 'Publish intent' }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(view.getByText('Say what a helpful reply looks like')).toBeTruthy();
  });

  it('refuses an expiry that has already passed', async () => {
    seedDraft({ publicDraft: { expiresAt: '2020-01-01T00:00:00.000Z' } });
    const view = await render(<PreviewIntentScreen />);

    expect(view.getByText('Choose an expiry in the future')).toBeTruthy();
  });

  it('publishes, clears the draft, and opens the new intent', async () => {
    const user = userEvent.setup();
    seedDraft();
    mockPublish.mockResolvedValue({
      intentId: 'intent-1',
      shareSlug: 'slug-1',
      status: 'live',
      version: 1,
    });

    const view = await render(<PreviewIntentScreen />);
    await user.press(view.getByRole('button', { name: 'Publish intent' }));

    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/intent/intent-1');
    expect(store[DRAFT_STORAGE_KEY]).toBeUndefined();
  });

  it('sends private details as their own fields, never inside public context', async () => {
    const user = userEvent.setup();
    seedDraft({ privateDraft: { exactAddress: '42 Private Lane' } });
    mockPublish.mockResolvedValue({
      intentId: 'intent-1',
      shareSlug: 'slug-1',
      status: 'live',
      version: 1,
    });

    const view = await render(<PreviewIntentScreen />);
    await user.press(view.getByRole('button', { name: 'Publish intent' }));

    const request = mockPublish.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(request.exactAddress).toBe('42 Private Lane');
    expect(request.statement).not.toContain('Private Lane');
    expect(request.approximatePlaceId).toBeNull();
  });

  it('keeps the draft when publishing fails', async () => {
    const user = userEvent.setup();
    seedDraft();
    mockPublish.mockRejectedValue(new Error('offline'));

    const view = await render(<PreviewIntentScreen />);
    await user.press(view.getByRole('button', { name: 'Publish intent' }));

    expect(await view.findByText(/Your draft is safe/)).toBeTruthy();
    expect(store[DRAFT_STORAGE_KEY]).toBeDefined();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('picks an area by name and never puts a coordinate in the draft', async () => {
    const user = userEvent.setup();
    seedDraft();
    const view = await render(<PreviewIntentScreen />);

    await user.press(await view.findByLabelText('Koramangala'));

    const saved = JSON.parse(store[DRAFT_STORAGE_KEY] ?? '{}');
    expect(saved.publicDraft.approximatePlaceId).toBe('place-2');
    expect(saved.publicDraft.approximatePlaceName).toBe('Koramangala');
    expect(JSON.stringify(saved)).not.toMatch(/latitude|longitude|\d{2}\.\d{4}/);
  });

  it('sends the place id, leaving the server to resolve the point', async () => {
    const user = userEvent.setup();
    seedDraft();
    mockPublish.mockResolvedValue({
      intentId: 'intent-1',
      shareSlug: 'slug-1',
      status: 'live',
      version: 1,
    });

    const view = await render(<PreviewIntentScreen />);
    await user.press(await view.findByLabelText('Indiranagar'));
    await user.press(view.getByRole('button', { name: 'Publish intent' }));

    const request = mockPublish.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(request.approximatePlaceId).toBe('place-1');
    expect('approximateLatitude' in request).toBe(false);
    expect('approximateLongitude' in request).toBe(false);
  });

  it('writes a private detail to the device draft, not into public context', async () => {
    const user = userEvent.setup();
    seedDraft();
    const view = await render(<PreviewIntentScreen />);

    await user.type(view.getByLabelText('Exact address'), '42 Private Lane');

    const saved = JSON.parse(store[DRAFT_STORAGE_KEY] ?? '{}');
    expect(saved.privateDraft.exactAddress).toBe('42 Private Lane');
    expect(JSON.stringify(saved.publicDraft)).not.toContain('42 Private Lane');
  });
});
