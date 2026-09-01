import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cancelPendingWrites,
  clearState,
  flushWrites,
  loadState,
  saveState,
} from './storage';

/**
 * The storage layer runs on the in-memory backend here (expo-sqlite
 * isn't resolvable outside a device), which is exactly the behaviour
 * we want to pin: same semantics, just not durable.
 */

afterEach(() => {
  cancelPendingWrites();
  vi.useRealTimers();
});

describe('persistence storage', () => {
  it('returns the fallback when nothing is stored', () => {
    expect(loadState('missing-key', { hello: 'world' })).toEqual({ hello: 'world' });
  });

  it('round-trips a value once the debounced write lands', () => {
    vi.useFakeTimers();
    saveState('round-trip', { count: 3, tags: ['a', 'b'] });

    // still debounced — nothing written yet
    expect(loadState('round-trip', null)).toBeNull();

    vi.advanceTimersByTime(200);
    expect(loadState('round-trip', null)).toEqual({ count: 3, tags: ['a', 'b'] });
  });

  it('coalesces rapid writes to the last value', () => {
    vi.useFakeTimers();
    saveState('coalesce', { n: 1 });
    saveState('coalesce', { n: 2 });
    saveState('coalesce', { n: 3 });

    vi.advanceTimersByTime(200);
    expect(loadState('coalesce', null)).toEqual({ n: 3 });
  });

  it('flushWrites persists a pending value immediately', () => {
    vi.useFakeTimers();
    saveState('flush-me', { saved: true });
    expect(loadState('flush-me', null)).toBeNull();

    // this is the force-quit path: no timer ever fires
    flushWrites();
    expect(loadState('flush-me', null)).toEqual({ saved: true });
  });

  it('cancelPendingWrites drops a pending value without writing it', () => {
    vi.useFakeTimers();
    saveState('cancel-me', { saved: true });
    cancelPendingWrites();

    vi.advanceTimersByTime(200);
    expect(loadState('cancel-me', null)).toBeNull();
  });

  it('revives ISO date strings back into Date objects', () => {
    vi.useFakeTimers();
    const startsAt = new Date('2026-08-27T19:00:00.000Z');
    saveState('with-dates', { startsAt, label: 'not-a-date' });
    vi.advanceTimersByTime(200);

    const loaded = loadState<{ startsAt: Date; label: string }>('with-dates', {
      startsAt: new Date(0),
      label: '',
    });
    expect(loaded.startsAt).toBeInstanceOf(Date);
    expect(loaded.startsAt.getTime()).toBe(startsAt.getTime());
    // plain strings must survive untouched
    expect(loaded.label).toBe('not-a-date');
  });

  it('falls back rather than throwing on a corrupt record', () => {
    vi.useFakeTimers();
    saveState('corrupt', { ok: true });
    vi.advanceTimersByTime(200);
    // simulate corruption by writing a raw non-JSON value under the
    // same key through the public API's own serialization path
    saveState('corrupt', undefined);
    vi.advanceTimersByTime(200);

    expect(loadState('corrupt', { ok: false })).toEqual({ ok: false });
  });

  it('clearState removes a stored record', () => {
    vi.useFakeTimers();
    saveState('to-clear', { present: true });
    vi.advanceTimersByTime(200);
    expect(loadState('to-clear', null)).toEqual({ present: true });

    clearState('to-clear');
    expect(loadState('to-clear', null)).toBeNull();
  });
});
