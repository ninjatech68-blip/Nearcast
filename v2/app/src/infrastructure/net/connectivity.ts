/**
 * Connectivity, inferred from what actually happened.
 *
 * We deliberately do NOT ship a radio-state library. A device can
 * hold five bars of a captive-portal wifi and reach nothing, and it
 * can be on a flaky train connection that a "connected" flag calls
 * healthy. What the UI needs to say is "your last few requests
 * failed", and that is knowable from the requests themselves.
 *
 * So: every submit reports its outcome here, and the status is
 * derived.
 *
 *   ok         — the last request succeeded
 *   struggling — one recent failure; worth a retry, not worth a banner
 *   offline    — OFFLINE_AFTER consecutive failures; say so plainly
 *
 * Pure state machine, no react and no i/o, so it is directly
 * testable.
 */

export type Connectivity = 'ok' | 'struggling' | 'offline';

/** consecutive failures before we call it offline rather than flaky. */
export const OFFLINE_AFTER = 2;

export type ConnectivityState = {
  consecutiveFailures: number;
  status: Connectivity;
};

export const INITIAL_CONNECTIVITY: ConnectivityState = {
  consecutiveFailures: 0,
  status: 'ok',
};

function statusFor(consecutiveFailures: number): Connectivity {
  if (consecutiveFailures === 0) return 'ok';
  if (consecutiveFailures < OFFLINE_AFTER) return 'struggling';
  return 'offline';
}

/** fold one request outcome into the connectivity state. */
export function recordOutcome(
  state: ConnectivityState,
  outcome: 'success' | 'failure',
): ConnectivityState {
  // any success clears the streak — one working request proves the
  // path is open, whatever came before it.
  const consecutiveFailures = outcome === 'success' ? 0 : state.consecutiveFailures + 1;
  return { consecutiveFailures, status: statusFor(consecutiveFailures) };
}

/** the line a queued-state surface shows. generated, never hand-written. */
export function connectivityNote(status: Connectivity): string | null {
  if (status === 'ok') return null;
  if (status === 'struggling') return "that didn't go through. tap to try again.";
  return "you're offline. we'll send it the moment you're back.";
}
