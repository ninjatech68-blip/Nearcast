import { useSyncExternalStore } from 'react';

import type { Verb } from '@/design-system/tokens';
import { casts as fixtureCasts, yourCasts as fixtureYourCasts, type ActivityItem, type CastDetail } from './fixtures';

/**
 * in-memory session store so the loop closes on device: a cast you
 * publish lands in the feed and in your casts immediately. replaced by
 * supabase in the backend phase; the shape stays.
 */

type State = {
  feed: readonly CastDetail[];
  mine: readonly ActivityItem[];
};

let state: State = {
  feed: fixtureCasts,
  mine: fixtureYourCasts,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFeedCasts(): readonly CastDetail[] {
  return useSyncExternalStore(subscribe, () => state.feed);
}

export function useMyCasts(): readonly ActivityItem[] {
  return useSyncExternalStore(subscribe, () => state.mine);
}

export function getCast(id: string): CastDetail | undefined {
  return state.feed.find((cast) => cast.id === id);
}

export function skipCast(id: string): void {
  state = { ...state, feed: state.feed.filter((cast) => cast.id !== id) };
  emit();
}

export function addCast(input: { verb: Verb; text: string; area: string; gone: string; reach: string }): void {
  const id = `mine-${Date.now()}`;
  const cast: CastDetail = {
    id,
    verb: input.verb,
    text: input.text,
    area: input.area,
    vouches: input.reach,
    expiry: input.gone,
    why: 'you cast this',
    by: 'Piyush',
    byLine: `${input.area} · your cast`,
    receipts: { lit: 4, line: '31 plans made real · 0 flakes' },
    body: input.text,
  };
  state = {
    feed: [cast, ...state.feed],
    mine: [{ id, title: input.text, sub: `live · 0 in · ${input.gone}`, castId: id }, ...state.mine],
  };
  emit();
}

/** test-only reset. */
export function resetCastStore(): void {
  state = { feed: fixtureCasts, mine: fixtureYourCasts };
  emit();
}
