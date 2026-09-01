import { describe, expect, it, jest } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

import { BarButton, QuietAction } from './button';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

describe('BarButton', () => {
  it('exposes its label as the accessible name and handles presses', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    const view = await render(<BarButton label="I'm in" onPress={onPress} />);

    await user.press(view.getByRole('button', { name: "I'm in" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks unavailable actions as disabled and blocks presses', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    const view = await render(<BarButton label="send it" onPress={onPress} disabled />);

    const button = view.getByRole('button', { name: 'send it' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });

    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it('replaces the label with the loader while loading and blocks presses', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    const view = await render(<BarButton label="cast it" onPress={onPress} loading />);

    expect(view.queryByText('cast it')).toBeNull();
    expect(view.getByLabelText('loading')).toBeTruthy();

    await user.press(view.getByRole('button', { name: 'cast it' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('QuietAction', () => {
  it('is a real button with a real target', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    const view = await render(<QuietAction label="skip" onPress={onPress} />);

    await user.press(view.getByRole('button', { name: 'skip' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
