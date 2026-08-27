import { describe, expect, it, jest } from '@jest/globals';
import { Keyboard } from 'react-native';
import { render, userEvent } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockDismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

jest.mock('expo-symbols', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');

  return {
    SymbolView: ({ fallback }: { fallback?: React.ReactNode }) => <Text>{fallback}</Text>,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CreateIntentScreen = require('./app/create').default;

describe('CreateIntentScreen', () => {
  it('dismisses the keyboard before moving to preview and carries the primitive default', async () => {
    const user = userEvent.setup();
    const view = await render(<CreateIntentScreen />);

    await user.type(view.getByLabelText('Intent statement'), 'Need two helpers for Saturday');
    await user.press(view.getByRole('button', { name: 'Review intent' }));

    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/preview',
      params: { primitive: 'plan', statement: 'Need two helpers for Saturday', area: '', time: '' },
    });
  });

  it('keeps the review button disabled until a statement is present', async () => {
    const view = await render(<CreateIntentScreen />);
    const button = view.getByRole('button', { name: 'Review intent' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  });
});
