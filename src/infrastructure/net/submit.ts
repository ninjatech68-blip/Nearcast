import { useSyncExternalStore } from 'react';

import {
  INITIAL_CONNECTIVITY,
  recordOutcome,
  type Connectivity,
  type ConnectivityState,
} from './connectivity';

/**
 * The single path every write takes: casting, joining, accepting,
 * sending a message, submitting a reflection.
 *
 * Today there is no server, so `submit` resolves after a short delay.
 * That is not the point — the point is that every caller already
 * handles the FAILURE branch, so when Supabase lands we swap the body
 * of one function and every screen's error and retry path is already
 * built and already exercised.
 *
 * Failures can be forced with `setFailureMode` so those branches can
 * be driven by hand on device. Without that, an error state is
 * written once and never seen again until a real user hits it.
 */

export type SubmitResult<T> = { ok: true; value: T } | { ok: false; reason: 'offline' | 'server' };

type FailureMode = 'none' | 'always';

let failureMode: FailureMode = 'none';
let connectivity: ConnectivityState = INITIAL_CONNECTIVITY;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** dev switch: force every submit to fail, to exercise error paths. */
export function setFailureMode(mode: FailureMode): void {
  failureMode = mode;
}

export function getFailureMode(): FailureMode {
  return failureMode;
}

export function useConnectivity(): Connectivity {
  return useSyncExternalStore(subscribe, () => connectivity.status);
}

export function getConnectivity(): Connectivity {
  return connectivity.status;
}

function report(outcome: 'success' | 'failure'): void {
  const next = recordOutcome(connectivity, outcome);
  if (next.status !== connectivity.status || next.consecutiveFailures !== connectivity.consecutiveFailures) {
    connectivity = next;
    emit();
  }
}

/** simulated round-trip latency, so loading states are actually visible. */
const LATENCY_MS = 450;

/**
 * Run a write. Resolves with a tagged result rather than throwing,
 * because every caller has to render the failure — making it an
 * exception invites a bare try/catch that swallows it silently.
 */
export async function submit<T>(work: () => T): Promise<SubmitResult<T>> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  if (failureMode === 'always') {
    report('failure');
    return { ok: false, reason: connectivity.status === 'offline' ? 'offline' : 'server' };
  }

  try {
    const value = work();
    report('success');
    return { ok: true, value };
  } catch {
    report('failure');
    return { ok: false, reason: 'server' };
  }
}

/** test-only reset. */
export function resetSubmit(): void {
  failureMode = 'none';
  connectivity = INITIAL_CONNECTIVITY;
  emit();
}
