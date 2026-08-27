import { useMemo, useSyncExternalStore } from 'react';

import { category as categoryTokens, type Category } from '@/design-system/tokens';
import { deliveryFor, type ViewerContext } from './domain/delivery';
import {
  casts as fixtureCasts,
  viewer,
  yourCasts as fixtureYourCasts,
  type ActivityItem,
  type CastDetail,
  type PendingJoin,
} from './fixtures';
import { useViewerContext } from '@/features/me/me-store';

/**
 * in-memory session store so the loop closes on device: a cast you
 * publish lands in the feed and in your casts immediately. replaced by
 * supabase in the backend phase; the shape stays.
 *
 * two lists: `feed` is casts BY OTHERS that the delivery framework
 * lets through; `myCasts` is casts YOU authored (always visible to
 * you, never subject to delivery gates because they are yours). they
 * never mix — the feed is decisions to make, my casts is what I have
 * out.
 */

function deliverFeed(source: readonly CastDetail[], ctx: ViewerContext = viewer): readonly CastDetail[] {
  const delivered: CastDetail[] = [];
  for (const cast of source) {
    if (cast.byId === 'me') continue; // your own casts belong in myCasts
    const result = deliveryFor(ctx, cast.delivery);
    if (!result.deliver) continue;
    delivered.push({ ...cast, why: result.reason, signals: result.signals });
  }
  return delivered;
}

type State = {
  feed: readonly CastDetail[];
  myCasts: readonly CastDetail[];
  mine: readonly ActivityItem[];
  /** session-only category lens. null = all. never trains delivery, never persists. */
  filter: readonly Category[] | null;
};

let state: State = {
  feed: deliverFeed(fixtureCasts),
  myCasts: fixtureCasts.filter((c) => c.byId === 'me'),
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

/**
 * a cast whose plan has already passed no longer appears in the feed.
 * fixture rule: the expiry string carries the day word ("gone thu",
 * "gone friday", "gone sat"); if today is past that day, drop the
 * cast. non-day expiries ("gone 10pm", "gone thu 9pm") stay in the
 * feed because we don't have a real timestamp to compare against.
 * production reads plan.startsAt + 2h from the row.
 */
function isStale(expiry: string, now: Date = new Date()): boolean {
  const cleaned = expiry.trim().toLowerCase().replace(/^gone\s+/, '').trim();
  const first = cleaned.split(/\s+/)[0];
  const dayMap: Record<string, number> = {
    sun: 0, sunday: 0,
    mon: 1, monday: 1,
    tue: 2, tues: 2, tuesday: 2,
    wed: 3, wednesday: 3,
    thu: 4, thur: 4, thurs: 4, thursday: 4,
    fri: 5, friday: 5,
    sat: 6, saturday: 6,
  };
  const day = dayMap[first];
  if (day === undefined) return false; // non-day expiries stay
  const today = now.getDay();
  // a cast for a day that has passed this week is stale. same-day is fine.
  // "past" means (day - today + 7) % 7 > 3 — over half the week away is
  // yesterday-or-earlier, since we assume casts don't schedule 7+ days out.
  const diff = (day - today + 7) % 7;
  return diff > 3;
}

export function useFeedCasts(): readonly CastDetail[] {
  // re-derive delivery when the viewer context changes (interests,
  // areas, blocked). the mutated base feed (pendingJoins, matched)
  // carries through — delivery only rewrites the why + signals + gates.
  const base = useSyncExternalStore(subscribe, () => state.feed);
  const ctx = useViewerContext();
  return useMemo(() => {
    const out: CastDetail[] = [];
    for (const c of base) {
      if (ctx.blockedCasterIds.includes(c.delivery.casterId)) continue;
      if (isStale(c.expiry)) continue;
      const result = deliveryFor(ctx, c.delivery);
      if (!result.deliver) continue;
      out.push({ ...c, why: result.reason, signals: result.signals });
    }
    return out;
  }, [base, ctx]);
}

export function useMyCastDetails(): readonly CastDetail[] {
  return useSyncExternalStore(subscribe, () => state.myCasts);
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
  const myCasts = useMyCastDetails();
  return useMemo(
    () =>
      myCasts.map((cast) => ({
        id: `mine-${cast.id}`,
        title: cast.text,
        sub: statusLine(cast),
        castId: cast.id,
      })),
    [myCasts],
  );
}

/**
 * pending joins across all your posted casts, as activity rows. one
 * row per (cast, joiner). tap a row → the invite sheet decides.
 */
export function usePendingJoinsOnMyCasts(): readonly ActivityItem[] {
  const myCasts = useMyCastDetails();
  return useMemo(() => {
    const items: ActivityItem[] = [];
    for (const cast of myCasts) {
      for (const join of cast.pendingJoins ?? []) {
        items.push({
          id: `join-${cast.id}-${join.personId}`,
          personId: join.personId,
          title: `${nameFor(join.personId)}'s in`,
          sub: `"${join.note}" · ${join.sentAgo} · ${cast.text}`,
          tag: { label: 'decide', tone: 'hot' },
          castId: cast.id,
        });
      }
    }
    return items;
  }, [myCasts]);
}

function nameFor(personId: string): string {
  // small local map avoids pulling the whole trust store into activity render
  const names: Record<string, string> = {
    riya: 'Riya',
    arjun: 'Arjun',
    kavya: 'Kavya',
    aarav: 'Aarav',
    meera: 'Meera',
    dev: 'Dev',
  };
  return names[personId] ?? personId;
}

function statusLine(cast: CastDetail): string {
  const filled = cast.matched?.length ?? 0;
  const wanted = cast.slotsWanted ?? 2;
  const remaining = Math.max(wanted - filled, 0);
  const pending = cast.pendingJoins?.length ?? 0;
  const parts = [`live · ${filled} in`];
  if (remaining > 0) parts.push(`${remaining} left`);
  else parts.push('full');
  if (pending > 0) parts.push(`${pending} pending`);
  parts.push(cast.expiry);
  return parts.join(' · ');
}

export function getCast(id: string): CastDetail | undefined {
  return state.feed.find((c) => c.id === id) ?? state.myCasts.find((c) => c.id === id);
}

export function skipCast(id: string): void {
  state = { ...state, feed: state.feed.filter((cast) => cast.id !== id) };
  emit();
}

/** slots + fill counters read from the cast, defaults applied here. */
export function slotsFor(cast: CastDetail): { wanted: number; filled: number; remaining: number; full: boolean } {
  const wanted = cast.slotsWanted ?? 2;
  const filled = cast.matched?.length ?? 0;
  const remaining = Math.max(wanted - filled, 0);
  return { wanted, filled, remaining, full: remaining === 0 };
}

/** joiner path: send a note. lands as pending on the caster's cast. */
export function submitJoin(castId: string, note: string, joinerId: string = 'me'): void {
  state = mutateCast(state, castId, (cast) => {
    const already = (cast.pendingJoins ?? []).some((j) => j.personId === joinerId);
    if (already) return cast;
    const join: PendingJoin = { personId: joinerId, note: note.trim(), sentAgo: 'just now' };
    return { ...cast, pendingJoins: [...(cast.pendingJoins ?? []), join] };
  });
  emit();
}

/** caster path: yes → fills a slot, joiner enters chat. no-op if already full. */
export function acceptJoin(castId: string, personId: string): void {
  state = mutateCast(state, castId, (cast) => {
    const s = slotsFor(cast);
    if (s.full) return cast;
    const pending = (cast.pendingJoins ?? []).filter((j) => j.personId !== personId);
    const alreadyMatched = (cast.matched ?? []).includes(personId);
    return {
      ...cast,
      pendingJoins: pending,
      matched: alreadyMatched ? cast.matched ?? [] : [...(cast.matched ?? []), personId],
    };
  });
  emit();
}

/** caster path: no → pending vanishes. silent to the joiner (product law: no reason given). */
export function declineJoin(castId: string, personId: string): void {
  state = mutateCast(state, castId, (cast) => ({
    ...cast,
    pendingJoins: (cast.pendingJoins ?? []).filter((j) => j.personId !== personId),
  }));
  emit();
}

/** look up a pending join by cast + person; drives the invite sheet. */
export function getPendingJoin(castId: string, personId: string): PendingJoin | undefined {
  const cast = getCast(castId);
  return cast?.pendingJoins?.find((j) => j.personId === personId);
}

/** joiner path: withdraw a join you sent. silent to the caster. */
export function withdrawJoin(castId: string, joinerId: string = 'me'): void {
  state = mutateCast(state, castId, (cast) => ({
    ...cast,
    pendingJoins: (cast.pendingJoins ?? []).filter((j) => j.personId !== joinerId),
  }));
  emit();
}

/** caster path: cancel your posted cast entirely. removes from myCasts. */
export function cancelCast(castId: string): void {
  state = {
    ...state,
    myCasts: state.myCasts.filter((c) => c.id !== castId),
    mine: state.mine.filter((row) => row.castId !== castId),
  };
  emit();
}

/** caster path: change slotsWanted. never below the current filled count. */
export function extendSlots(castId: string, nextWanted: number): void {
  state = mutateCast(state, castId, (cast) => {
    const filled = cast.matched?.length ?? 0;
    return { ...cast, slotsWanted: Math.max(nextWanted, filled) };
  });
  emit();
}

/**
 * joins you sent that are still pending on someone else's cast.
 * one row per (cast, me) — surfaces as "waiting on {caster}" in
 * activity. tap → withdraw or open the cast detail.
 */
export function useJoinsISent(): readonly {
  castId: string;
  castTitle: string;
  casterName: string;
  casterId: string;
  sentAgo: string;
}[] {
  const feed = useSyncExternalStore(subscribe, () => state.feed);
  return useMemo(() => {
    const items: {
      castId: string;
      castTitle: string;
      casterName: string;
      casterId: string;
      sentAgo: string;
    }[] = [];
    for (const cast of feed) {
      const mine = cast.pendingJoins?.find((j) => j.personId === 'me');
      if (mine) {
        items.push({
          castId: cast.id,
          castTitle: cast.text,
          casterName: cast.by,
          casterId: cast.byId,
          sentAgo: mine.sentAgo,
        });
      }
    }
    return items;
  }, [feed]);
}

function mutateCast(current: State, castId: string, transform: (cast: CastDetail) => CastDetail): State {
  return {
    ...current,
    feed: current.feed.map((c) => (c.id === castId ? transform(c) : c)),
    myCasts: current.myCasts.map((c) => (c.id === castId ? transform(c) : c)),
  };
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
    slotsWanted: 2,
    matched: [],
    pendingJoins: [],
  };
  state = {
    ...state,
    myCasts: [cast, ...state.myCasts],
    mine: [{ id, title: input.text, sub: `live · 0 in · 2 left · ${input.gone}`, castId: id }, ...state.mine],
  };
  emit();
}

/** test-only reset. */
export function resetCastStore(): void {
  state = {
    feed: deliverFeed(fixtureCasts),
    myCasts: fixtureCasts.filter((c) => c.byId === 'me'),
    mine: fixtureYourCasts,
    filter: null,
  };
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
