import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen, userEvent, waitFor } from '@testing-library/react-native';

import { renderScreen } from './test-utils';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ intentId: 'intent-1' }),
}));

const mockFetchEditable = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockUpdateIntent = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('@/features/intents/data/intent-queries', () => ({
  fetchEditableIntent: (...a: unknown[]) => mockFetchEditable(...a),
  updateIntent: (...a: unknown[]) => mockUpdateIntent(...a),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const EditIntentScreen = require('./app/edit/[intentId]').default;

function editable(overrides: Record<string, unknown> = {}) {
  return {
    id: 'intent-1',
    version: 3,
    status: 'live',
    statement: 'Need a table for six on Friday',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    approximatePlace: 'Koramangala',
    priceMinor: 40000,
    currency: 'INR',
    responseCount: 2,
    ...overrides,
  };
}

describe('EditIntentScreen', () => {
  beforeEach(() => {
    mockFetchEditable.mockReset();
    mockUpdateIntent.mockReset();
    mockBack.mockReset();
  });

  it('warns that existing respondents will be told what changed', async () => {
    mockFetchEditable.mockResolvedValue({ state: 'ok', data: editable() });

    await renderScreen(<EditIntentScreen />);

    await waitFor(() => expect(screen.getByTestId('edit-notice')).toBeTruthy());
    expect(
      screen.getByText('2 people have already responded. They will be told what changed.'),
    ).toBeTruthy();
  });

  it('says nothing about notifying anyone when nobody has responded', async () => {
    mockFetchEditable.mockResolvedValue({
      state: 'ok',
      data: editable({ responseCount: 0 }),
    });

    await renderScreen(<EditIntentScreen />);

    await waitFor(() => expect(screen.getByText('Edit intent')).toBeTruthy());
    expect(screen.queryByTestId('edit-notice')).toBeNull();
  });

  it('sends only the fields that actually changed, against the loaded version', async () => {
    mockFetchEditable.mockResolvedValue({ state: 'ok', data: editable() });
    mockUpdateIntent.mockResolvedValue({ ok: true, version: 4, changed: ['location'] });
    const user = userEvent.setup();

    await renderScreen(<EditIntentScreen />);
    await waitFor(() => expect(screen.getByTestId('edit-notice')).toBeTruthy());

    await user.clear(screen.getByLabelText('Approximate area'));
    await user.type(screen.getByLabelText('Approximate area'), 'Indiranagar');
    await user.press(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mockUpdateIntent).toHaveBeenCalledTimes(1));
    expect(mockUpdateIntent).toHaveBeenCalledWith('intent-1', 3, {
      approximatePlace: 'Indiranagar',
    });
  });

  it('refuses to save when nothing has changed', async () => {
    mockFetchEditable.mockResolvedValue({ state: 'ok', data: editable() });
    const user = userEvent.setup();

    await renderScreen(<EditIntentScreen />);
    await waitFor(() => expect(screen.getByTestId('edit-notice')).toBeTruthy());

    await user.press(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByTestId('edit-error')).toBeTruthy());
    expect(screen.getByText('Nothing has changed yet.')).toBeTruthy();
    expect(mockUpdateIntent).not.toHaveBeenCalled();
  });

  it('rejects a price that is not a number before reaching the server', async () => {
    mockFetchEditable.mockResolvedValue({ state: 'ok', data: editable() });
    const user = userEvent.setup();

    await renderScreen(<EditIntentScreen />);
    await waitFor(() => expect(screen.getByTestId('edit-notice')).toBeTruthy());

    await user.clear(screen.getByLabelText('Price'));
    await user.type(screen.getByLabelText('Price'), 'about four hundred');
    await user.press(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(screen.getByText('Enter the price as a number, or leave it blank.')).toBeTruthy(),
    );
    expect(mockUpdateIntent).not.toHaveBeenCalled();
  });

  it('keeps the person on the screen and shows why when the server refuses', async () => {
    mockFetchEditable.mockResolvedValue({ state: 'ok', data: editable() });
    mockUpdateIntent.mockResolvedValue({
      ok: false,
      message: 'Your changes were not saved. This intent may have changed — reload and try again.',
    });
    const user = userEvent.setup();

    await renderScreen(<EditIntentScreen />);
    await waitFor(() => expect(screen.getByTestId('edit-notice')).toBeTruthy());

    await user.clear(screen.getByLabelText('Approximate area'));
    await user.type(screen.getByLabelText('Approximate area'), 'Indiranagar');
    await user.press(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          'Your changes were not saved. This intent may have changed — reload and try again.',
        ),
      ).toBeTruthy(),
    );
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('refuses to edit an intent that has moved past coordination', async () => {
    mockFetchEditable.mockResolvedValue({
      state: 'ok',
      data: editable({ status: 'matched' }),
    });

    await renderScreen(<EditIntentScreen />);

    await waitFor(() =>
      expect(
        screen.getByText(
          'This intent can no longer be edited. Coordination has started or it has closed.',
        ),
      ).toBeTruthy(),
    );
  });
});
