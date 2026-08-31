/**
 * When the app should try to register a push token.
 *
 * Pure and dependency-free on purpose: this is the only part of push
 * registration with a decision in it, and everything around it is behind
 * a native module that cannot be loaded in a test.
 *
 * Registration used to run on one trigger — `me.signedIn` going true —
 * which is the same as saying it runs once per cold start. That is
 * enough while permission never changes, and wrong the moment it does.
 * iOS resets notification permission when an app is deleted, and the
 * only way back is the Settings toggle, which produces a RESUME and
 * never a sign-in. So a phone that declined the prompt (or lost it to a
 * reinstall) had no path back at all: `refreshPushRegistration` returns
 * silently at the permission check, writes nothing, reports nothing, and
 * nothing re-runs it.
 *
 * Resume is therefore a trigger. But resume also fires every time
 * someone flicks to another app and back, and registration is a native
 * token fetch plus a network round-trip, so it is throttled.
 */

/** how long a resume waits before it is allowed to retry. */
export const REGISTRATION_RETRY_MS = 60_000;

export type RegistrationTrigger = 'signed-in' | 'resumed';

/**
 * @param lastAttemptAt epoch ms of the last attempt, or null if never.
 * @param now epoch ms.
 */
export function shouldAttemptRegistration(
  trigger: RegistrationTrigger,
  lastAttemptAt: number | null,
  now: number,
): boolean {
  // signing in is rare and decisive: a new account's token must land
  // immediately, whatever happened a moment ago on the previous one.
  if (trigger === 'signed-in') return true;
  if (lastAttemptAt === null) return true;
  // a clock that jumped backwards must not lock registration out until
  // real time catches up with the stale stamp.
  if (now < lastAttemptAt) return true;
  return now - lastAttemptAt >= REGISTRATION_RETRY_MS;
}
