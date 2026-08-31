import { describe, expect, it, jest } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  router: { back: () => undefined },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('expo-symbols', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');

  return {
    SymbolView: ({ fallback }: { fallback?: React.ReactNode }) => <Text>{fallback}</Text>,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const EditProfileScreen = require('./app/profile/edit').default;

function renderScreen(next: Record<string, string> = {}) {
  mockParams = next;
  return render(<EditProfileScreen />);
}

describe('edit profile structure', () => {
  it('separates profile, privacy, and account', async () => {
    const view = await renderScreen();

    expect(view.getByText('Profile')).toBeTruthy();
    expect(view.getByText('Privacy')).toBeTruthy();
    expect(view.getByText('Account')).toBeTruthy();
  });

  it('carries the profile fields the product requires', async () => {
    const view = await renderScreen();

    expect(view.getByLabelText('Display name')).toBeTruthy();
    expect(view.getByLabelText('Approximate home area')).toBeTruthy();
    expect(view.getByLabelText('Interests')).toBeTruthy();
  });

  it('explains each privacy setting in plain language', async () => {
    const view = await renderScreen();

    expect(
      view.getByText('People can see your first name and approximate area.'),
    ).toBeTruthy();
    expect(
      view.getByText('Your originating group and its members remain private.'),
    ).toBeTruthy();
  });
});

describe('destructive actions', () => {
  it('asks before signing out', async () => {
    const user = userEvent.setup();
    const view = await renderScreen();

    await user.press(view.getByRole('button', { name: 'Sign out' }));

    expect(view.getByText('Sign out of Nearcast?')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('states what deleting the account does and whether it can be undone', async () => {
    const user = userEvent.setup();
    const view = await renderScreen();

    await user.press(view.getByRole('button', { name: 'Delete account' }));

    expect(
      view.getByText('This permanently removes your profile, casts, and messages. It cannot be undone.'),
    ).toBeTruthy();
  });

  it('offers data export before deletion', async () => {
    const view = await renderScreen();

    expect(view.getByRole('button', { name: 'Export your data' })).toBeTruthy();
  });
});

describe('edit profile hardening', () => {
  it('explains a denied photo permission and how to fix it', async () => {
    const view = await renderScreen({ photo: 'denied' });

    expect(
      view.getByText('Nearcast cannot reach your photos. Allow photo access in Settings to change your picture.'),
    ).toBeTruthy();
  });

  it('names which fields failed to save rather than reporting a blanket error', async () => {
    const view = await renderScreen({ save: 'partial' });

    expect(view.getByText('Some changes were not saved')).toBeTruthy();
    expect(view.getByText('Approximate home area could not be updated. Everything else saved.')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('does not truncate a long display name', async () => {
    const view = await renderScreen();
    const field = view.getByLabelText('Display name');

    expect(field.props.numberOfLines).toBeUndefined();
  });
});
