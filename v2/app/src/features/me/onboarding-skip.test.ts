import { beforeEach, describe, expect, it } from 'vitest';

import { currentName, hydrateReturningProfile, isOnboardingDone, setName, setSignedIn, signOut } from './me-store';

describe('returning user skips onboarding', () => {
  beforeEach(() => {
    signOut();
  });

  it('starts a fresh device NOT onboarded, so a new account still sees setup', () => {
    setSignedIn('new@example.com');
    expect(isOnboardingDone()).toBe(false);
  });

  it('a complete backend profile marks onboarding done and restores the name', () => {
    setSignedIn('piyush@example.com');
    hydrateReturningProfile({
      name: 'Piyush',
      approvedAreas: ['indiranagar', 'hsr'],
      areaPoints: { indiranagar: { latitude: 12.97, longitude: 77.64 } },
      interests: ['sports'],
    });
    expect(isOnboardingDone()).toBe(true);
    expect(currentName()).toBe('Piyush');
  });

  it('a blank server name never overwrites the name already on the device', () => {
    setSignedIn('x@example.com');
    setName('Shalvi');
    hydrateReturningProfile({ name: '   ', approvedAreas: ['koramangala'] });
    expect(currentName()).toBe('Shalvi');
    expect(isOnboardingDone()).toBe(true);
  });
});
