import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, userEvent, within } from '@testing-library/react-native';

import { DRAFT_STORAGE_KEY } from '@/features/intents/create/domain/draft-storage';

const store: Record<string, string> = {};

jest.mock('expo-router', () => ({
  router: { back: () => undefined, push: () => undefined },
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
      approximatePlace: null,
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
  });

  it('states that nothing is visible while the draft is still local', async () => {
    seedDraft();
    const view = await render(<PreviewIntentScreen />);

    expect(
      view.getByText('Nothing yet. This draft is only on your device.'),
    ).toBeTruthy();
  });

  it('shows the public context that publishing would reveal', async () => {
    seedDraft({ publicDraft: { approximatePlace: 'Indiranagar' } });
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
