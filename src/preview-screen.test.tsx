import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen, userEvent, waitFor, within } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockParams = { primitive: 'request', statement: 'Need a projector on Saturday' };
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a), push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const mockPublish = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('@/features/intents/data/intent-queries', () => ({
  publishIntent: (...a: unknown[]) => mockPublish(...a),
  PRIMITIVE_LABELS: { request: 'I need', offer: 'I offer', plan: 'I want to' },
}));

const mockLoadDraft = jest.fn<() => unknown>();
const mockSaveDraft = jest.fn();
const mockClearDraft = jest.fn();
jest.mock('@/features/intents/data/draft-store', () => ({
  loadDraft: () => mockLoadDraft(),
  saveDraft: (...a: unknown[]) => mockSaveDraft(...a),
  clearDraft: () => mockClearDraft(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PreviewScreen = require('./app/preview').default;

describe('PreviewScreen', () => {
  beforeEach(() => {
    mockPublish.mockReset();
    mockReplace.mockReset();
    mockLoadDraft.mockReset();
    mockSaveDraft.mockReset();
    mockClearDraft.mockReset();
    mockLoadDraft.mockReturnValue(null);
    mockParams.statement = 'Need a projector on Saturday';
  });

  it('clears the local draft once the server confirms the intent is live', async () => {
    mockPublish.mockResolvedValue({ state: 'ok', intentId: 'intent-9', shareSlug: 'slug-9' });
    const user = userEvent.setup();

    await render(<PreviewScreen />);
    await user.press(screen.getByRole('button', { name: 'Broadcast intent' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/intent/intent-9'));
    expect(mockClearDraft).toHaveBeenCalledTimes(1);
  });

  it('keeps the draft and says so plainly when the request never reached the server', async () => {
    mockPublish.mockResolvedValue({
      state: 'error',
      message: 'Your draft is saved on this device. It will not be published until you are online.',
      offline: true,
    });
    const user = userEvent.setup();

    await render(<PreviewScreen />);
    await user.press(screen.getByRole('button', { name: 'Broadcast intent' }));

    await waitFor(() => expect(screen.getByTestId('publish-offline')).toBeTruthy());
    expect(mockClearDraft).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('never claims success when the server refuses the publish', async () => {
    mockPublish.mockResolvedValue({
      state: 'error',
      message: 'Your intent was not published. Try again.',
      offline: false,
    });
    const user = userEvent.setup();

    await render(<PreviewScreen />);
    await user.press(screen.getByRole('button', { name: 'Broadcast intent' }));

    await waitFor(() => expect(screen.getByTestId('publish-error')).toBeTruthy());
    expect(screen.queryByTestId('publish-offline')).toBeNull();
    expect(mockClearDraft).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('retries with the same idempotency key, so a recovered connection cannot double-publish', async () => {
    mockPublish.mockResolvedValue({
      state: 'error',
      message: 'Your draft is saved on this device. It will not be published until you are online.',
      offline: true,
    });
    const user = userEvent.setup();

    await render(<PreviewScreen />);
    await user.press(screen.getByRole('button', { name: 'Broadcast intent' }));
    await waitFor(() => expect(screen.getByTestId('publish-offline')).toBeTruthy());

    mockPublish.mockResolvedValue({ state: 'ok', intentId: 'intent-9', shareSlug: 'slug-9' });
    await user.press(screen.getByRole('button', { name: 'Broadcast intent' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    const [first] = mockPublish.mock.calls[0] as [{ idempotencyKey: string }];
    const [second] = mockPublish.mock.calls[1] as [{ idempotencyKey: string }];
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
  });

  it('states the default expiry before anyone publishes', async () => {
    await render(<PreviewScreen />);

    expect(
      screen.getByText('This intent expires in 48 hours unless you resolve it sooner.'),
    ).toBeTruthy();
  });

  it('starts at the narrowest reach, so publishing cannot widen it by default', async () => {
    await render(<PreviewScreen />);

    expect(
      screen.getByRole('radio', { name: /My trusted circles/ }).props.accessibilityState.selected,
    ).toBe(true);
  });

  it('restores the reach and disclosure choices from the stored draft', async () => {
    mockLoadDraft.mockReturnValue({
      primitive: 'request',
      statement: 'Need a projector on Saturday',
      reach: 'nearby_relevant',
      publicLinkEnabled: false,
      showFirstName: false,
      updatedAt: '2026-08-26T09:00:00.000Z',
    });

    await render(<PreviewScreen />);

    expect(
      screen.getByRole('radio', { name: /Relevant people nearby/ }).props.accessibilityState
        .selected,
    ).toBe(true);
  });

  it('persists a widened reach as a deliberate choice before publishing', async () => {
    const user = userEvent.setup();
    await render(<PreviewScreen />);

    await user.press(screen.getByRole('radio', { name: /People connected to my circles/ }));

    const last = mockSaveDraft.mock.calls.at(-1)?.[0] as { reach: string };
    expect(last.reach).toBe('adjacent_network');
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('warns before publishing when the statement carries an exact address', async () => {
    mockParams.statement = 'Drop it at 221 Baker Street any time on Saturday';

    await render(<PreviewScreen />);

    const warning = within(screen.getByTestId('privacy-warning'));
    expect(warning.getByText(/looks like it includes an exact address/)).toBeTruthy();
  });

  it('warns when the statement carries contact details', async () => {
    mockParams.statement = 'Call me on +91 99000 00000 if you can help';

    await render(<PreviewScreen />);

    const warning = within(screen.getByTestId('privacy-warning'));
    expect(warning.getByText(/looks like it includes contact details/)).toBeTruthy();
  });

  it('warns without blocking, because the words are the broadcaster\'s own', async () => {
    mockParams.statement = 'Drop it at 221 Baker Street any time on Saturday';
    mockPublish.mockResolvedValue({ state: 'ok', intentId: 'intent-9', shareSlug: 'slug-9' });
    const user = userEvent.setup();

    await render(<PreviewScreen />);
    await user.press(screen.getByRole('button', { name: 'Broadcast intent' }));

    await waitFor(() => expect(mockPublish).toHaveBeenCalledTimes(1));
  });

  it('says nothing when the statement is already privacy-safe', async () => {
    await render(<PreviewScreen />);

    expect(screen.queryByTestId('privacy-warning')).toBeNull();
  });
});
