import { describe, expect, it, jest } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

import { AppearanceProvider } from '@/design-system/appearance';
import { colorsFor } from '@/design-system/tokens';

import { Button } from './button';

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Number.POSITIVE_INFINITY).filter(Boolean));

describe('Button', () => {
  it('exposes its label as the accessible button name and handles presses', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    const view = await render(<Button label="Review intent" onPress={onPress} />);

    await user.press(view.getByRole('button', { name: 'Review intent' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks unavailable actions as disabled, explains why, and prevents presses', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    const view = await render(
      <Button
        disabled
        label="Offer help"
        onPress={onPress}
        unavailableReason="This intent has expired."
      />,
    );

    const button = view.getByRole('button', { name: 'Offer help' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    expect(button.props.accessibilityHint).toBe('This intent has expired.');

    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it('announces loading as busy and blocks presses while working', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    const view = await render(<Button label="Post intent" loading onPress={onPress} />);

    const button = view.getByRole('button', { name: 'Post intent' });
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });

    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps a disabled control disabled even while it is loading', async () => {
    const view = await render(<Button disabled label="Post intent" loading onPress={jest.fn()} />);

    expect(flatten(view.getByRole('button').props.style).opacity).toBe(0.45);
  });

  it('paints each variant from the semantic palette of the active appearance', async () => {
    const light = colorsFor('light');

    const view = await render(
      <AppearanceProvider appearance="light">
        <Button label="Consent" onPress={jest.fn()} />
      </AppearanceProvider>,
    );

    expect(flatten(view.getByRole('button').props.style).backgroundColor).toBe(
      light.action.primary,
    );
  });

  it('tints the danger variant on the dark appearance instead of filling it', async () => {
    const dark = colorsFor('dark');

    const view = await render(
      <AppearanceProvider appearance="dark">
        <Button label="Report" onPress={jest.fn()} variant="danger" />
      </AppearanceProvider>,
    );

    expect(flatten(view.getByRole('button').props.style).backgroundColor).toBe(
      dark.background.danger,
    );
  });

  it('draws the outline recovery variant with no fill', async () => {
    const view = await render(
      <AppearanceProvider appearance="light">
        <Button label="Try again" onPress={jest.fn()} variant="outline" />
      </AppearanceProvider>,
    );

    const style = flatten(view.getByRole('button').props.style);
    expect(style.backgroundColor).toBe('transparent');
    expect(style.borderColor).toBe(colorsFor('light').action.primary);
  });

  it('meets the minimum touch target on every platform', async () => {
    const view = await render(<Button label="Offer help" onPress={jest.fn()} />);

    expect(flatten(view.getByRole('button').props.style).minHeight).toBeGreaterThanOrEqual(48);
  });
});
