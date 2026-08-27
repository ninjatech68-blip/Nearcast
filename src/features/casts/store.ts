import { useSyncExternalStore } from 'react';

import { category as categoryTokens, type Category } from '@/design-system/tokens';
import { deliveryFor } from './domain/delivery';
import { casts as fixtureCasts, viewer, yourCasts as fixtureYourCasts, type ActivityItem, type CastDetail } from './fixtures';

/**
 * in-memory session store so the loop closes on device: a cast you
 * publish lands in the feed and in your casts immediately. replaced by
 * supabase in the backend phase; the shape stays.
 *
 * the feed runs every cast through the delivery framework: a cast with
 * no matched signal never renders, and the why line is the framework's
 * generated reason — never fixture prose.
 */

function deliverFeed(source: readonly CastDetail[]): readonly CastDetail[] {
  const delivered: CastDetail[] = [];
  for (const cast of source) {
    const result = deliveryFor(viewer, cast.delivery);
    if (!result.deliver) continue;
    delivered.push({ ...cast, why: result.reason, signals: result.signals });
  }
  return delivered;
}

type State = {
  feed: readonly CastDetail[];
  mine: readonly ActivityItem[];
  /** session-only category lens. null = all. never trains delivery, never persists. */
  filter: readonly Category[] | null;
};

let state: State = {
  feed: deliverFeed(fixtureCasts),
  mine: fixtureYourCasts,
  filter: null,
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

export function useFilter(): readonly Category[] | null {
  return useSyncExternalStore(subscribe, () => state.filter);
}

export function setFilter(filter: readonly Category[] | null): void {
  state = { ...state, filter: filter && filter.length > 0 ? filter : null };
  emit();
}

export function feedCountFor(filter: readonly Category[] | null): number {
  if (!filter || filter.length === 0) return state.feed.length;
  return state.feed.filter((cast) => filter.includes(cast.category)).length;
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

export function addCast(input: {
  category: Category;
  text: string;
  area: string;
  gone: string;
  reach: string;
  exactSpot?: string;
}): void {
  const id = `mine-${Date.now()}`;
  const cast: CastDetail = {
    id,
    category: input.category,
    text: input.text,
    area: input.area,
    vouches: input.reach,
    expiry: input.gone,
    why: 'you cast this',
    signals: ['you cast this'],
    exactSpot: input.exactSpot,
    by: 'Piyush',
    byId: 'me',
    byLine: `${input.area} · your cast`,
    receipts: { lit: 4, line: '31 plans made real · 0 flakes' },
    body: input.text,
    delivery: {
      casterId: 'me',
      area: input.area,
      category: input.category,
      categoryLabel: categoryTokens[input.category].label,
      window: null,
      reach: 'adjacent_network',
      casterCircleIds: [],
    },
  };
  state = {
    ...state,
    feed: [cast, ...state.feed],
    mine: [{ id, title: input.text, sub: `live · 0 in · ${input.gone}`, castId: id }, ...state.mine],
  };
  emit();
}

/** test-only reset. */
export function resetCastStore(): void {
  state = { feed: deliverFeed(fixtureCasts), mine: fixtureYourCasts, filter: null };
  emit();
}

/**
 * compose draft: the area picker is its own screen (keyboard needs the
 * room), so it hands its answer back through here.
 */
type Draft = { area: string };
let draft: Draft = { area: '' };
const draftListeners = new Set<() => void>();

function subscribeDraft(listener: () => void): () => void {
  draftListeners.add(listener);
  return () => draftListeners.delete(listener);
}

export function useDraftArea(): string {
  return useSyncExternalStore(subscribeDraft, () => draft.area);
}

export function setDraftArea(area: string): void {
  draft = { area };
  draftListeners.forEach((listener) => listener());
}

export function clearDraft(): void {
  setDraftArea('');
}
