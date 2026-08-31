import { describe, expect, it } from 'vitest';

import { REGISTRATION_RETRY_MS, shouldAttemptRegistration } from './registration-policy';

/**
 * WHY THIS EXISTS.
 *
 * Push registration only ran when `me.signedIn` flipped. Someone who
 * declined the permission prompt during onboarding — or lost it by
 * deleting and reinstalling the app, which resets iOS permission — was
 * then stuck permanently: `refreshPushRegistration` returns at the
 * permission check without writing anything or reporting anything, and
 * nothing re-ran it. Granting permission in iOS Settings and coming back
 * to the app changed nothing, because coming back is not a sign-in.
 *
 * A real device sat in exactly that state for four hours: signed in,
 * holding a live presence lease, its push token frozen at the value it
 * had before the reinstall.
 *
 * So resume is a trigger. But resume fires on every app switch, and
 * registration costs a native token fetch plus a network RPC, so it is
 * throttled — the retry window is the whole reason this is a decision
 * rather than a bare `next === 'active'`.
 */
describe('when to attempt push registration', () => {
  it('always attempts on sign-in, however recently it last tried', () => {
    expect(shouldAttemptRegistration('signed-in', 0, 1)).toBe(true);
  });

  it('attempts on the first resume, having never tried', () => {
    expect(shouldAttemptRegistration('resumed', null, 10_000)).toBe(true);
  });

  // THE REGRESSION: permission granted in iOS Settings, then back to the
  // app. That is a resume, not a sign-in, and it has to register.
  it('attempts on a resume once the retry window has passed', () => {
    const last = 1_000_000;
    expect(shouldAttemptRegistration('resumed', last, last + REGISTRATION_RETRY_MS)).toBe(true);
  });

  it('does not re-attempt on every app switch', () => {
    const last = 1_000_000;
    expect(shouldAttemptRegistration('resumed', last, last + 1)).toBe(false);
    expect(shouldAttemptRegistration('resumed', last, last + REGISTRATION_RETRY_MS - 1)).toBe(false);
  });

  // a clock that jumps backwards (timezone change, NTP correction) must
  // not disable registration until it catches up.
  it('attempts when the clock has moved backwards since the last try', () => {
    expect(shouldAttemptRegistration('resumed', 5_000_000, 1_000)).toBe(true);
  });

  it('throttles nothing but resumes', () => {
    const last = 1_000_000;
    expect(shouldAttemptRegistration('signed-in', last, last + 1)).toBe(true);
  });
});
