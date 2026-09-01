import { describe, expect, it } from 'vitest';

import {
  connectivityNote,
  INITIAL_CONNECTIVITY,
  OFFLINE_AFTER,
  recordOutcome,
  type ConnectivityState,
} from './connectivity';

function fold(outcomes: readonly ('success' | 'failure')[]): ConnectivityState {
  return outcomes.reduce(recordOutcome, INITIAL_CONNECTIVITY);
}

describe('connectivity inference', () => {
  it('starts ok', () => {
    expect(INITIAL_CONNECTIVITY.status).toBe('ok');
  });

  it('calls a single failure struggling, not offline', () => {
    // one failure is a flake — showing an offline banner for it would
    // be crying wolf.
    expect(fold(['failure']).status).toBe('struggling');
  });

  it('calls consecutive failures offline', () => {
    const outcomes = Array.from({ length: OFFLINE_AFTER }, () => 'failure' as const);
    expect(fold(outcomes).status).toBe('offline');
  });

  it('one success clears the whole streak', () => {
    // a working request proves the path is open, whatever came before
    const after = fold(['failure', 'failure', 'failure', 'success']);
    expect(after.consecutiveFailures).toBe(0);
    expect(after.status).toBe('ok');
  });

  it('re-enters offline only after a fresh streak', () => {
    const recovered = fold(['failure', 'failure', 'success']);
    expect(recovered.status).toBe('ok');
    expect(recordOutcome(recovered, 'failure').status).toBe('struggling');
  });

  it('generates a note for every non-ok status and none when ok', () => {
    expect(connectivityNote('ok')).toBeNull();
    expect(connectivityNote('struggling')).toMatch(/try again/);
    expect(connectivityNote('offline')).toMatch(/offline/);
  });
});
