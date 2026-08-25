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

  it('outlines the destructive variant in danger rather than filling it', async () => {
    for (const appearance of ['light', 'dark'] as const) {
      const view = await render(
        <AppearanceProvider appearance={appearance}>
          <Button label="Report" onPress={jest.fn()} variant="destructive" />
        </AppearanceProvider>,
      );

      const style = flatten(view.getByRole('button').props.style);
      expect(style.backgroundColor).toBe('transparent');
      expect(style.borderColor).toBe(colorsFor(appearance).status.danger);
    }
  });

  it('fills the primary action and nothing else', async () => {
    for (const appearance of ['light', 'dark'] as const) {
      for (const variant of ['secondary', 'quiet', 'destructive'] as const) {
        const view = await render(
          <AppearanceProvider appearance={appearance}>
            <Button label="Action" onPress={jest.fn()} variant={variant} />
          </AppearanceProvider>,
        );

        expect({
          appearance,
          variant,
          background: flatten(view.getByRole('button').props.style).backgroundColor,
        }).toEqual({ appearance, variant, background: 'transparent' });
      }

      const primary = await render(
        <AppearanceProvider appearance={appearance}>
          <Button label="Action" onPress={jest.fn()} />
        </AppearanceProvider>,
      );

      expect(flatten(primary.getByRole('button').props.style).backgroundColor).toBe(
        colorsFor(appearance).action.primary,
      );
    }
  });

  it('draws the secondary recovery variant as an outline of the primary action', async () => {
    const view = await render(
      <AppearanceProvider appearance="light">
        <Button label="Try again" onPress={jest.fn()} variant="secondary" />
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
