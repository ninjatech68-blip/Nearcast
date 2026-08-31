import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

import type { MyProfile } from '@/features/auth/data/auth-repository';

const mockFetch = jest.fn<() => Promise<MyProfile | null>>();
const mockSignOut = jest.fn<() => Promise<void>>();

jest.mock('expo-symbols', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');

  return {
    SymbolView: ({ fallback }: { fallback?: React.ReactNode }) => <Text>{fallback}</Text>,
  };
});

jest.mock('@/features/auth/data/auth-repository', () => ({
  fetchMyProfile: () => mockFetch(),
  signOut: () => mockSignOut(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YouScreen = require('./app/(tabs)/you').default;

describe('You', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockSignOut.mockReset();
    mockFetch.mockResolvedValue({ displayName: 'Dev Mehta', homeArea: 'Indiranagar' });
    mockSignOut.mockResolvedValue(undefined);
  });

  it('shows your own name and area', async () => {
    const view = await render(<YouScreen />);

    expect(await view.findByText('Dev Mehta')).toBeTruthy();
    expect(view.getByText('Indiranagar')).toBeTruthy();
  });

  it('shows no score or count, because none is measured yet', async () => {
    const view = await render(<YouScreen />);

    await view.findByText('Dev Mehta');
    expect(view.queryByText(/trust score/i)).toBeNull();
    expect(view.queryByText(/followers/i)).toBeNull();
  });

  it('signs out on request', async () => {
    const user = userEvent.setup();
    const view = await render(<YouScreen />);

    await user.press(await view.findByRole('button', { name: 'Sign out' }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('says an area is not chosen rather than inventing one', async () => {
    mockFetch.mockResolvedValue({ displayName: 'Dev Mehta', homeArea: null });

    const view = await render(<YouScreen />);

    expect(await view.findByText('No area chosen yet')).toBeTruthy();
  });

  it('reports a failed load instead of showing a blank profile', async () => {
    mockFetch.mockRejectedValue(new Error('offline'));

    const view = await render(<YouScreen />);

    expect(await view.findByText(/could not load your profile/)).toBeTruthy();
  });
});
