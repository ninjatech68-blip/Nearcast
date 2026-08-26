import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen } from '@testing-library/react-native';

import { renderScreen } from './test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/features/auth/sign-in', () => ({
  signInWithProvider: jest.fn(),
  AUTH_PROVIDERS: ['google', 'apple'],
}));

const mockAvailable = jest.fn<() => boolean>();
jest.mock('@/features/auth/dev-sign-in', () => ({
  devSignInAvailable: () => mockAvailable(),
  signInWithDevPassword: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SignInScreen = require('./app/sign-in').default;

describe('SignInScreen', () => {
  beforeEach(() => {
    mockAvailable.mockReset();
  });

  it('always offers Google and Apple, the only production methods', async () => {
    mockAvailable.mockReturnValue(false);

    await renderScreen(<SignInScreen />);

    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue with Apple' })).toBeTruthy();
  });

  it('shows the development entrance outside production, clearly labelled', async () => {
    mockAvailable.mockReturnValue(true);

    await renderScreen(<SignInScreen />);

    expect(screen.getByTestId('dev-sign-in')).toBeTruthy();
    expect(screen.getByText(/Local testing only/)).toBeTruthy();
    expect(screen.getByText(/never\s+available in production/)).toBeTruthy();
  });

  it('prints the seeded personas so the founder does not open seed.sql on first boot', async () => {
    mockAvailable.mockReturnValue(true);

    await renderScreen(<SignInScreen />);

    const hint = screen.getByTestId('dev-personas-hint');
    expect(hint).toBeTruthy();
    expect(hint.props.children).toMatch(/asha@nearcast\.local/);
    expect(hint.props.children).toMatch(/dev@nearcast\.local/);
    expect(hint.props.children).toMatch(/mira@nearcast\.local/);
    expect(hint.props.children).toMatch(/nearcast-local/);
  });

  it('hides the development entrance entirely in production', async () => {
    mockAvailable.mockReturnValue(false);

    await renderScreen(<SignInScreen />);

    expect(screen.queryByTestId('dev-sign-in')).toBeNull();
    expect(screen.queryByText(/Development sign-in/)).toBeNull();
  });
});
