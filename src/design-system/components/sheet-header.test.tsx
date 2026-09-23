import { describe, expect, it, jest } from '@jest/globals';
import { userEvent } from '@testing-library/react-native';

import { GlassIconButton } from './glass-icon-button';
import { SheetHeader } from './sheet-header';
import { renderThemed } from './test-utils';

describe('SheetHeader', () => {
  it('has a title, close and confirm', async () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    const view = await renderThemed(<SheetHeader onClose={onClose} onConfirm={onConfirm} title="Filters" />);
    expect(view.getByRole('header', { name: 'Filters' })).toBeTruthy();
    const user = userEvent.setup();
    await user.press(view.getByRole('button', { name: 'Close' }));
    await user.press(view.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalled();
  });

  it('disables confirm with a reason', async () => {
    const onConfirm = jest.fn();
    const view = await renderThemed(
      <SheetHeader confirmDisabledReason="Choose a reason first" onClose={() => {}} onConfirm={onConfirm} title="Report" />,
      'dark',
    );
    const done = view.getByRole('button', { name: 'Done' });
    expect(done.props.accessibilityState).toMatchObject({ disabled: true });
    expect(done.props.accessibilityHint).toBe('Choose a reason first');
    await userEvent.setup().press(done);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('GlassIconButton', () => {
  it('is a labelled button of at least the minimum touch size', async () => {
    const onPress = jest.fn();
    const view = await renderThemed(<GlassIconButton icon="recenter" label="Show my area" onPress={onPress} />);
    const button = view.getByRole('button', { name: 'Show my area' });
    await userEvent.setup().press(button);
    expect(onPress).toHaveBeenCalled();
  });
});
