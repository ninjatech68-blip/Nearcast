import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

import type { RedeemOutcome } from '@/features/auth/domain/membership';

const mockRequestCode = jest.fn<(email: string) => Promise<void>>();
const mockVerifyCode = jest.fn<(email: string, code: string) => Promise<void>>();
const mockRedeem = jest.fn<(token: string, name: string) => Promise<RedeemOutcome>>();
let mockFacts = { hasSession: false, hasProfile: false, hasHomeArea: false };
const mockSetHomePlace = jest.fn<(placeId: string) => Promise<string>>();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: () => undefined }),
  useSegments: () => ['sign-in'],
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/features/location/data/places-repository', () => ({
  fetchPlaces: async () => [
    { id: 'place-1', name: 'Indiranagar', region: 'Bengaluru' },
    { id: 'place-2', name: 'Koramangala', region: 'Bengaluru' },
  ],
  setHomePlace: (placeId: string) => mockSetHomePlace(placeId),
}));

jest.mock('@/features/auth/data/auth-repository', () => ({
  requestSignInCode: (email: string) => mockRequestCode(email),
  verifySignInCode: (email: string, code: string) => mockVerifyCode(email, code),
  redeemInvite: (token: string, name: string) => mockRedeem(token, name),
  fetchMembershipFacts: async () => mockFacts,
  subscribeToAuthChanges: () => () => undefined,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SignInScreen = require('./app/sign-in').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SessionProvider } = require('@/features/auth/ui/session-provider');

const renderSignIn = () =>
  render(
    <SessionProvider>
      <SignInScreen />
    </SessionProvider>,
  );

describe('Sign-in', () => {
  beforeEach(() => {
    mockRequestCode.mockReset();
    mockVerifyCode.mockReset();
    mockRedeem.mockReset();
    mockSetHomePlace.mockReset();
    mockSetHomePlace.mockResolvedValue('Indiranagar');
    mockFacts = { hasSession: false, hasProfile: false, hasHomeArea: false };
  });

  it('will not send a code to a malformed address', async () => {
    const user = userEvent.setup();
    const view = await renderSignIn();

    await user.type(view.getByLabelText('Email'), 'not-an-email');

    const send = view.getByRole('button', { name: 'Send code' });
    expect(send.props.accessibilityState).toMatchObject({ disabled: true });

    await user.press(send);
    expect(mockRequestCode).not.toHaveBeenCalled();
  });

  it('normalises the address and asks for the code', async () => {
    const user = userEvent.setup();
    mockRequestCode.mockResolvedValue(undefined);
    const view = await renderSignIn();

    await user.type(view.getByLabelText('Email'), '  Asha@Nearcast.APP ');
    await user.press(view.getByRole('button', { name: 'Send code' }));

    expect(mockRequestCode).toHaveBeenCalledWith('asha@nearcast.app');
    expect(await view.findByLabelText('Six-digit code')).toBeTruthy();
  });

  it('shows one generic message when sending fails, revealing nothing', async () => {
    const user = userEvent.setup();
    mockRequestCode.mockRejectedValue(new Error('User not found'));
    const view = await renderSignIn();

    await user.type(view.getByLabelText('Email'), 'asha@nearcast.app');
    await user.press(view.getByRole('button', { name: 'Send code' }));

    expect(
      await view.findByText(/We could not complete that step/),
    ).toBeTruthy();
    expect(view.queryByText(/User not found/)).toBeNull();
  });

  it('rejects a code that is not six digits', async () => {
    const user = userEvent.setup();
    mockRequestCode.mockResolvedValue(undefined);
    const view = await renderSignIn();

    await user.type(view.getByLabelText('Email'), 'asha@nearcast.app');
    await user.press(view.getByRole('button', { name: 'Send code' }));
    await user.type(await view.findByLabelText('Six-digit code'), '12345');

    expect(
      view.getByRole('button', { name: 'Confirm code' }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(mockVerifyCode).not.toHaveBeenCalled();
  });

  it('asks a verified but uninvited identity for an invitation', async () => {
    mockFacts = { hasSession: true, hasProfile: false, hasHomeArea: false };
    const view = await renderSignIn();

    expect(await view.findByText('Redeem your invitation')).toBeTruthy();
    expect(view.getByLabelText('Invitation code')).toBeTruthy();
    expect(view.queryByLabelText('Email')).toBeNull();
  });

  it('gives one indistinguishable message for a refused invitation', async () => {
    const user = userEvent.setup();
    mockFacts = { hasSession: true, hasProfile: false, hasHomeArea: false };
    mockRedeem.mockResolvedValue('invalid_invite');
    const view = await renderSignIn();

    await user.type(await view.findByLabelText('Invitation code'), 'wrong-code');
    await user.type(view.getByLabelText('Your name'), 'Asha Rao');
    await user.press(view.getByRole('button', { name: 'Join Nearcast' }));

    expect(
      await view.findByText(/That invitation cannot be used/),
    ).toBeTruthy();
  });

  it('reports a throttle distinctly from a refusal', async () => {
    const user = userEvent.setup();
    mockFacts = { hasSession: true, hasProfile: false, hasHomeArea: false };
    mockRedeem.mockResolvedValue('rate_limited');
    const view = await renderSignIn();

    await user.type(await view.findByLabelText('Invitation code'), 'wrong-code');
    await user.type(view.getByLabelText('Your name'), 'Asha Rao');
    await user.press(view.getByRole('button', { name: 'Join Nearcast' }));

    expect(await view.findByText(/Too many attempts/)).toBeTruthy();
  });

  it('asks a member with no area to choose one before letting them in', async () => {
    mockFacts = { hasSession: true, hasProfile: true, hasHomeArea: false };
    const view = await renderSignIn();

    expect(await view.findByText('Choose your area')).toBeTruthy();
    expect(await view.findByLabelText('Indiranagar')).toBeTruthy();
    expect(view.queryByLabelText('Invitation code')).toBeNull();
    expect(view.queryByLabelText('Email')).toBeNull();
  });

  it('will not save until an area is chosen, then saves the chosen one', async () => {
    const user = userEvent.setup();
    mockFacts = { hasSession: true, hasProfile: true, hasHomeArea: false };
    const view = await renderSignIn();

    await view.findByText('Choose your area');
    expect(
      view.getByRole('button', { name: 'Use this area' }).props.accessibilityState,
    ).toMatchObject({ disabled: true });

    await user.press(view.getByLabelText('Koramangala'));
    await user.press(view.getByRole('button', { name: 'Use this area' }));

    expect(mockSetHomePlace).toHaveBeenCalledWith('place-2');
  });

  it('states what the area reveals and what it does not', async () => {
    mockFacts = { hasSession: true, hasProfile: true, hasHomeArea: false };
    const view = await renderSignIn();

    expect(
      await view.findByText(/exact location is never shared/),
    ).toBeTruthy();
  });

  it('trims the redeemed name to match the database constraint', async () => {
    const user = userEvent.setup();
    mockFacts = { hasSession: true, hasProfile: false, hasHomeArea: false };
    mockRedeem.mockResolvedValue('redeemed');
    const view = await renderSignIn();

    await user.type(await view.findByLabelText('Invitation code'), '  token-1  ');
    await user.type(view.getByLabelText('Your name'), '  Asha Rao  ');
    await user.press(view.getByRole('button', { name: 'Join Nearcast' }));

    expect(mockRedeem).toHaveBeenCalledWith('token-1', 'Asha Rao');
  });
});
