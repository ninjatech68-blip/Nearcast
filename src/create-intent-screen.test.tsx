import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Keyboard } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockDismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

const mockLoadDraft = jest.fn<() => unknown>();
const mockSaveDraft = jest.fn();
jest.mock('@/features/intents/data/draft-store', () => ({
  loadDraft: () => mockLoadDraft(),
  saveDraft: (...a: unknown[]) => mockSaveDraft(...a),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CreateIntentScreen = require('./app/create').default;

describe('CreateIntentScreen', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockDismiss.mockClear();
    mockLoadDraft.mockReset();
    mockSaveDraft.mockReset();
    mockLoadDraft.mockReturnValue(null);
  });

  it('dismisses the keyboard before moving to preview', async () => {
    const user = userEvent.setup();
    const view = await render(<CreateIntentScreen />);

    await user.type(view.getByLabelText('Intent statement'), 'Need two helpers for Saturday');
    await user.press(view.getByRole('button', { name: 'Review intent' }));

    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/preview', params: { primitive: 'request', statement: 'Need two helpers for Saturday' } });
  });

  it('writes the draft to the device as it is typed', async () => {
    const user = userEvent.setup();
    await render(<CreateIntentScreen />);

    await user.type(screen.getByLabelText('Intent statement'), 'Need');

    expect(mockSaveDraft).toHaveBeenCalled();
    const last = mockSaveDraft.mock.calls.at(-1)?.[0] as { statement: string };
    expect(last.statement).toBe('Need');
  });

  it('records a changed primitive in the same draft', async () => {
    const user = userEvent.setup();
    await render(<CreateIntentScreen />);

    await user.press(screen.getByRole('radio', { name: 'I offer' }));

    const last = mockSaveDraft.mock.calls.at(-1)?.[0] as { primitive: string };
    expect(last.primitive).toBe('offer');
  });

  it('caps the statement at the 500 characters the column allows, and starts as a request', async () => {
    await render(<CreateIntentScreen />);

    expect(screen.getByLabelText('Intent statement').props.maxLength).toBe(500);
    expect(screen.getByRole('radio', { name: 'I need' }).props.accessibilityState.selected).toBe(
      true,
    );
  });

  it('restores an unfinished draft and says where it came from', async () => {
    mockLoadDraft.mockReturnValue({
      primitive: 'plan',
      statement: 'Want to start a Tuesday run group',
      reach: 'adjacent_network',
      publicLinkEnabled: true,
      showFirstName: true,
      updatedAt: '2026-08-26T09:00:00.000Z',
    });

    await render(<CreateIntentScreen />);

    expect(screen.getByDisplayValue('Want to start a Tuesday run group')).toBeTruthy();
    expect(screen.getByTestId('draft-restored')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'I want to' }).props.accessibilityState.selected).toBe(
      true,
    );
  });

  it('starts empty, and says nothing about restoring, when the stored draft is blank', async () => {
    mockLoadDraft.mockReturnValue({
      primitive: 'request',
      statement: '   ',
      reach: 'origin_only',
      publicLinkEnabled: true,
      showFirstName: true,
      updatedAt: '2026-08-26T09:00:00.000Z',
    });

    await render(<CreateIntentScreen />);

    expect(screen.queryByTestId('draft-restored')).toBeNull();
    expect(screen.getByRole('button', { name: 'Review intent' }).props.accessibilityState.disabled).toBe(
      true,
    );
  });
});
