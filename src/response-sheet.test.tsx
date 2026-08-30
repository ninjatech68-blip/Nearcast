import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockSubmit = jest.fn<(input: unknown) => Promise<unknown>>();

jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useLocalSearchParams: () => ({ id: 'intent-1', firstName: 'Dev' }),
}));

jest.mock('@/features/responses/data/responses-repository', () => ({
  submitResponse: (input: unknown) => mockSubmit(input),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ResponseSheetScreen = require('./app/request/[id]').default;

describe('Response sheet', () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockSubmit.mockReset();
    mockSubmit.mockResolvedValue({ responseId: 'response-1', status: 'pending' });
  });

  it('will not send an empty response', async () => {
    const view = await render(<ResponseSheetScreen />);

    expect(
      view.getByRole('button', { name: 'Send response' }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('sends the note and closes the sheet', async () => {
    const user = userEvent.setup();
    const view = await render(<ResponseSheetScreen />);

    await user.type(view.getByLabelText('Your note'), 'Happy to help on Saturday');
    await user.press(view.getByRole('button', { name: 'Send response' }));

    const input = mockSubmit.mock.calls[0]?.[0] as {
      intentId: string;
      draft: { message: string };
    };
    expect(input.intentId).toBe('intent-1');
    expect(input.draft.message).toBe('Happy to help on Saturday');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('sends only the qualifications actually claimed', async () => {
    const user = userEvent.setup();
    const view = await render(<ResponseSheetScreen />);

    await user.type(view.getByLabelText('Your note'), 'Happy to help');
    await user.press(view.getByLabelText('I have transport'));
    await user.press(view.getByRole('button', { name: 'Send response' }));

    const input = mockSubmit.mock.calls[0]?.[0] as {
      draft: { qualification: Record<string, boolean> };
    };
    expect(input.draft.qualification.has_transport).toBe(true);
    expect(input.draft.qualification.can_travel).toBeUndefined();
  });

  it('states what the broadcaster will see and what stays private', async () => {
    const user = userEvent.setup();
    const view = await render(<ResponseSheetScreen />);

    await user.type(view.getByLabelText('Your note'), 'Happy to help');

    const disclosure = view.getByLabelText('What they will see');
    expect(disclosure).toHaveTextContent(/Your first name: Dev/);
    expect(disclosure).toHaveTextContent(/Your note: Happy to help/);
    expect(disclosure).toHaveTextContent(/Your contact details/);
    expect(disclosure).toHaveTextContent(/Your exact location/);
  });

  it('never shows another person’s response', async () => {
    const view = await render(<ResponseSheetScreen />);

    expect(view.queryByText(/other responses|competing|1 of/i)).toBeNull();
  });

  it('keeps the note when sending fails, and explains without blaming the reader', async () => {
    const user = userEvent.setup();
    mockSubmit.mockRejectedValue(new Error('stale_state'));
    const view = await render(<ResponseSheetScreen />);

    await user.type(view.getByLabelText('Your note'), 'Happy to help');
    await user.press(view.getByRole('button', { name: 'Send response' }));

    expect(await view.findByText(/could not send that/)).toBeTruthy();
    expect(view.getByLabelText('Your note').props.value).toBe('Happy to help');
    expect(mockBack).not.toHaveBeenCalled();
  });
});
