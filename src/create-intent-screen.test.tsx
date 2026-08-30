import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

import { DRAFT_STORAGE_KEY } from '@/features/intents/create/domain/draft-storage';

const mockPush = jest.fn();
const store: Record<string, string> = {};

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
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
const CreateIntentScreen = require('./app/create').default;

describe('CreateIntentScreen', () => {
  beforeEach(() => {
    mockPush.mockReset();
    for (const key of Object.keys(store)) delete store[key];
  });

  it('will not review a draft without a primitive and a statement', async () => {
    const user = userEvent.setup();
    const view = await render(<CreateIntentScreen />);

    const review = view.getByRole('button', { name: 'Review intent' });
    expect(review.props.accessibilityState).toMatchObject({ disabled: true });

    await user.type(view.getByLabelText('Intent statement'), 'Need two helpers');
    expect(
      view.getByRole('button', { name: 'Review intent' }).props.accessibilityState,
    ).toMatchObject({ disabled: true });

    await user.press(view.getByLabelText('I need'));
    await user.press(view.getByRole('button', { name: 'Review intent' }));

    expect(mockPush).toHaveBeenCalledWith('/preview');
  });

  it('keeps the draft on the device instead of passing it through navigation', async () => {
    const user = userEvent.setup();
    const view = await render(<CreateIntentScreen />);

    await user.press(view.getByLabelText('I offer'));
    await user.type(view.getByLabelText('Intent statement'), 'Spare desk on Sunday');
    await user.press(view.getByRole('button', { name: 'Review intent' }));

    expect(mockPush).toHaveBeenCalledWith('/preview');
    expect(JSON.stringify(mockPush.mock.calls)).not.toContain('Spare desk');
    expect(store[DRAFT_STORAGE_KEY]).toContain('Spare desk on Sunday');
  });

  it('recovers a draft saved by an earlier visit', async () => {
    store[DRAFT_STORAGE_KEY] = JSON.stringify({
      publicDraft: {
        primitive: 'request',
        statement: 'Need a ladder',
        responseAction: '',
        expiresAt: '2099-01-01T00:00:00.000Z',
        startsAt: null,
        deadlineAt: null,
        quantity: null,
        priceMinor: null,
        currency: null,
        approximatePlace: null,
        approximateLongitude: null,
        approximateLatitude: null,
        requirements: [],
      },
      privateDraft: {
        exactAddress: null,
        privateContact: null,
        coordinationNotes: null,
      },
      updatedAt: '2026-08-30T12:00:00.000Z',
    });

    const view = await render(<CreateIntentScreen />);

    expect(view.getByLabelText('Intent statement').props.value).toBe('Need a ladder');
    expect(view.getByLabelText('I need').props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it('counts down the remaining characters against the 500 limit', async () => {
    const user = userEvent.setup();
    const view = await render(<CreateIntentScreen />);

    await user.type(view.getByLabelText('Intent statement'), 'Need a ladder');

    expect(view.getByText('487 characters left')).toBeTruthy();
  });

  it('discards the draft on request, leaving nothing stored', async () => {
    const user = userEvent.setup();
    const view = await render(<CreateIntentScreen />);

    await user.type(view.getByLabelText('Intent statement'), 'Need a ladder');
    await user.press(view.getByLabelText('Discard draft'));

    expect(view.getByLabelText('Intent statement').props.value).toBe('');
    expect(store[DRAFT_STORAGE_KEY]).toBeUndefined();
  });
});
