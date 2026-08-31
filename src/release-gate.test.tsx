import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { BackendMode } from '@/infrastructure/config/env';

const mockMode = jest.fn<() => BackendMode>();
const mockStatus = jest.fn<() => string>();
const mockIsRelease = jest.fn<() => boolean>();

jest.mock('@/infrastructure/supabase/client', () => ({
  backendMode: () => mockMode(),
  backendStatus: () => mockStatus(),
}));

jest.mock('@/infrastructure/config/env', () => {
  // The decision itself is the real one; only the build flag is faked, so
  // this test exercises the same releaseBlock the app runs.
  const actual = jest.requireActual('@/infrastructure/config/env') as object;

  return { ...actual, isReleaseBuild: () => mockIsRelease() };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ReleaseGate } = require('@/infrastructure/config/release-gate');

function app() {
  return (
    <ReleaseGate>
      <Text>the app</Text>
    </ReleaseGate>
  );
}

describe('ReleaseGate', () => {
  beforeEach(() => {
    mockMode.mockReset();
    mockStatus.mockReset();
    mockIsRelease.mockReset();
    mockStatus.mockReturnValue('connected to https://abc.supabase.co');
  });

  it('lets the app through when the backend is live', async () => {
    mockIsRelease.mockReturnValue(true);
    mockMode.mockReturnValue('live');

    const view = await render(app());

    expect(view.getByText('the app')).toBeTruthy();
  });

  /**
   * The finding this gate exists for: a release build on fixtures shows a
   * tester invented activity they cannot distinguish from real activity.
   */
  it('stops a release build that has no backend, and does not render the app', async () => {
    mockIsRelease.mockReturnValue(true);
    mockMode.mockReturnValue('fixtures');
    mockStatus.mockReturnValue('no EXPO_PUBLIC_SUPABASE_* config');

    const view = await render(app());

    expect(view.getByText('This build has no backend')).toBeTruthy();
    expect(view.queryByText('the app')).toBeNull();
  });

  it('stops a misconfigured build and names the variable at fault', async () => {
    mockIsRelease.mockReturnValue(true);
    mockMode.mockReturnValue('misconfigured');
    mockStatus.mockReturnValue(
      'EXPO_PUBLIC_APP_ENV must be one of local, staging, production',
    );

    const view = await render(app());

    expect(view.getByText(/EXPO_PUBLIC_APP_ENV/)).toBeTruthy();
    expect(view.queryByText('the app')).toBeNull();
  });

  it('leaves a development build on fixtures alone', async () => {
    mockIsRelease.mockReturnValue(false);
    mockMode.mockReturnValue('fixtures');

    const view = await render(app());

    expect(view.getByText('the app')).toBeTruthy();
  });

  it('stops a misconfigured development build too', async () => {
    mockIsRelease.mockReturnValue(false);
    mockMode.mockReturnValue('misconfigured');
    mockStatus.mockReturnValue('EXPO_PUBLIC_SUPABASE_URL must be a full URL');

    const view = await render(app());

    expect(view.queryByText('the app')).toBeNull();
  });
});
