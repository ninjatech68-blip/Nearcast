import { describe, expect, it, jest } from '@jest/globals';
import { Keyboard } from 'react-native';
import { render, userEvent } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockDismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CreateIntentScreen = require('./app/create').default;

describe('CreateIntentScreen', () => {
  it('dismisses the keyboard before moving to preview', async () => {
    const user = userEvent.setup();
    const view = await render(<CreateIntentScreen />);

    await user.type(view.getByLabelText('Intent statement'), 'Need two helpers for Saturday');
    await user.press(view.getByRole('button', { name: 'Review intent' }));

    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/preview', params: { primitive: 'request', statement: 'Need two helpers for Saturday' } });
  });
});
