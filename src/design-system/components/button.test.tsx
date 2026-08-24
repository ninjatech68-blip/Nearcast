import { describe, expect, it, jest } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

import { Button } from './button';

describe('Button', () => {
  it('exposes its label as the accessible button name and handles presses', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    const view = await render(<Button label="Review intent" onPress={onPress} />);

    await user.press(view.getByRole('button', { name: 'Review intent' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks unavailable actions as disabled and prevents presses', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    const view = await render(<Button label="Review intent" onPress={onPress} disabled />);

    const button = view.getByRole('button', { name: 'Review intent' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });

    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });
});
