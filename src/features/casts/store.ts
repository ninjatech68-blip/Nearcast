import { useMemo, useSyncExternalStore } from 'react';

import { category as categoryTokens, type Category } from '@/design-system/tokens';
import { deliveryFor, type ViewerContext } from './domain/delivery';
import { DEFAULT_RADIUS_KM } from './domain/geo';
import { fetchFeed, publishCast, remoteEnabled } from './remote';
import { matchesQuery } from './domain/search';
import {
  casts as fixtureCasts,
  viewer,
  yourCasts as fixtureYourCasts,
  type ActivityItem,
  type CastDetail,
  type PendingJoin,
} from './fixtures';
import { useViewerContext } from '@/features/me/me-store';
import {
  clearState,
  loadState,
  registerStoreReset,
  saveState,
  STORAGE_KEYS,
} from '@/infrastructure/persistence/storage';

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
  /** session-only text lens, same rules as `filter`. narrows what you
   *  were already delivered — never reaches past the delivery gates. */
  query: string;
};

/**
 * What we persist, and why it is not simply `State`.
 *
 * `feed` is derived from FIXTURES. Persisting it whole would freeze
 * the fixture set at first launch — add a cast to fixtures.ts and an
 * existing install would never see it. So instead we persist:
 *
 *  - myCasts / mine: casts YOU authored. Nothing derives these, they
 *    are yours, they persist in full.
 *  - overlay: per-fixture-cast join state (pendingJoins, matched).
 *    Re-applied over the freshly derived feed on load, so fixture
 *    changes flow through while your join/accept history survives.
 *  - skipped: ids you swiped past, so they stay gone.
 *
 * `filter` is deliberately absent — the session lens resets when you
 * leave the feed, and that is a product rule, not an oversight.
 */
type CastOverlay = {
  pendingJoins?: readonly PendingJoin[];
  matched?: readonly string[];
  slotsWanted?: number;
};

type PersistedCasts = {
  myCasts: readonly CastDetail[];
  mine: readonly ActivityItem[];
  overlay: Record<string, CastOverlay>;
  skipped: readonly string[];
};

function hydrate(): State {
  const saved = loadState<Partial<PersistedCasts>>(STORAGE_KEYS.casts, {});
  const overlay = saved.overlay ?? {};
  const skipped = new Set(saved.skipped ?? []);

  // derive the feed fresh from fixtures, then re-apply saved join
  // state and drop anything the viewer already skipped.
  const feed = deliverFeed(fixtureCasts)
    .filter((cast) => !skipped.has(cast.id))
    .map((cast) => (overlay[cast.id] ? { ...cast, ...overlay[cast.id] } : cast));

  const savedMine = saved.myCasts;
  return {
    feed,
    // a first launch seeds from fixtures; afterwards your own casts
    // are whatever you actually have (including none, if you cancelled
    // them all — which is why we check for the key, not truthiness).
    myCasts: savedMine ?? fixtureCasts.filter((c) => c.byId === 'me'),
    mine: saved.mine ?? fixtureYourCasts,
    filter: null,
    query: '',
  };
}

let state: State = hydrate();
let skippedIds: string[] = loadState<Partial<PersistedCasts>>(STORAGE_KEYS.casts, {}).skipped?.slice() ?? [];

function persist(): void {
  const overlay: Record<string, CastOverlay> = {};
  for (const cast of state.feed) {
    const hasJoins = (cast.pendingJoins?.length ?? 0) > 0;
    const hasMatched = (cast.matched?.length ?? 0) > 0;
    if (hasJoins || hasMatched) {
      overlay[cast.id] = {
        pendingJoins: cast.pendingJoins,
        matched: cast.matched,
        slotsWanted: cast.slotsWanted,
      };
    }
  }
  const payload: PersistedCasts = {
    myCasts: state.myCasts,
    mine: state.mine,
    overlay,
    skipped: skippedIds,
  };
  saveState(STORAGE_KEYS.casts, payload);
}

const listeners = new Set<() => void>();

function emit() {
  persist();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

registerStoreReset(() => {
  skippedIds = [];
  state = {
    feed: deliverFeed(fixtureCasts),
    myCasts: fixtureCasts.filter((c) => c.byId === 'me'),
    mine: fixtureYourCasts,
    filter: null,
    query: '',
  };
  listeners.forEach((listener) => listener());
});

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

export function useQuery(): string {
  return useSyncExternalStore(subscribe, () => state.query);
}

export function setQuery(query: string): void {
  state = { ...state, query };
  emit();
}

/** the lens applied to an already-delivered feed: categories AND text. */
export function applyLens(
  casts: readonly CastDetail[],
  filter: readonly Category[] | null,
  query: string,
): readonly CastDetail[] {
  let out = casts;
  if (filter && filter.length > 0) out = out.filter((cast) => filter.includes(cast.category));
  if (query.trim().length > 0) {
    out = out.filter((cast) =>
      matchesQuery(
        {
          text: cast.text,
          by: cast.by,
          area: cast.area,
          categoryLabel: categoryTokens[cast.category].label,
        },
        query,
      ),
    );
  }
  return out;
}

/** honest count for the filter sheet's primary button. */
export function feedCountFor(filter: readonly Category[] | null, query: string = ''): number {
  return applyLens(state.feed, filter, query).length;
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

/**
 * The caster's own row for a cast they posted.
 *
 * No headcount and no capacity: "2 in · 1 left" made a plan read as a
 * scoreboard, and an empty one read as a failure. What the caster
 * actually needs from this row is whether anyone is waiting on them,
 * so that — and only that — is what it adds to the live/expiry line.
 */
function statusLine(cast: CastDetail): string {
  const pending = cast.pendingJoins?.length ?? 0;
  const parts = ['live'];
  if (pending > 0) parts.push(pending === 1 ? '1 waiting on you' : `${pending} waiting on you`);
  parts.push(cast.expiry);
  return parts.join(' · ');
}

export function getCast(id: string): CastDetail | undefined {
  return state.feed.find((c) => c.id === id) ?? state.myCasts.find((c) => c.id === id);
}

export function skipCast(id: string): void {
  if (!skippedIds.includes(id)) skippedIds = [...skippedIds, id];
  state = { ...state, feed: state.feed.filter((cast) => cast.id !== id) };
  emit();
}

/**
 * how many people are in, and whether the caster set a cap.
 *
 * Slots are hidden from the whole app: nothing asks for a number and
 * nothing shows one. So a cast with no `slotsWanted` has NO ceiling —
 * an invisible cap that silently refuses the third yes would be worse
 * than the friction we removed. The field survives for casts that
 * genuinely carry one (the schema and its trigger still enforce it),
 * and only those can ever read as full.
 */
export function capacityFor(cast: CastDetail): { filled: number; capped: boolean; full: boolean } {
  const filled = cast.matched?.length ?? 0;
  const wanted = cast.slotsWanted;
  if (wanted === undefined) return { filled, capped: false, full: false };
  return { filled, capped: true, full: filled >= wanted };
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
    if (capacityFor(cast).full) return cast;
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

export type AddCastInput = {
  category: Category;
  text: string;
  area: string;
  gone: string;
  /** how far from `area` the caster wants it to travel. */
  radiusKm?: number;
  /** the area's approximate centre, when the picker could place it */
  latitude?: number | null;
  longitude?: number | null;
  /** when the plan starts, and when the cast stops being live */
  startsAt?: Date | null;
  expiresAt?: Date;
};

/**
 * Publish a cast.
 *
 * With a backend configured this goes through `publish_cast` and then
 * refreshes from the server, so what you see afterwards is what was
 * actually stored rather than an optimistic copy that might not match.
 * Without one it writes the local store, exactly as before. Callers
 * already run this inside `submit`, which renders either outcome.
 */
export async function addCast(input: AddCastInput): Promise<void> {
  if (remoteEnabled()) {
    await publishCast({
      category: input.category,
      text: input.text,
      area: input.area,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      radiusKm: input.radiusKm ?? DEFAULT_RADIUS_KM,
      startsAt: input.startsAt ?? null,
      expiresAt: input.expiresAt ?? defaultExpiry(),
    });
    // the publish is the deliverable and it has already succeeded. a
    // failed feed refresh must NOT report the publish as failed — that
    // would show "try again" on a cast that went out, and tapping it
    // would publish a duplicate. refresh best-effort; the feed reloads
    // itself on next view anyway.
    try {
      await refreshFeed();
    } catch {
      // swallowed on purpose: see above.
    }
    return;
  }

  const id = `mine-${Date.now()}`;
  const radiusKm = input.radiusKm ?? DEFAULT_RADIUS_KM;
  const cast: CastDetail = {
    id,
    category: input.category,
    text: input.text,
    area: input.area,
    vouches: `${radiusKm} km`,
    expiry: input.gone,
    why: 'you cast this',
    signals: ['you cast this'],
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
      radiusKm,
      casterCircleIds: [],
    },
    matched: [],
    pendingJoins: [],
  };
  state = {
    ...state,
    myCasts: [cast, ...state.myCasts],
    mine: [
      { id, title: input.text, sub: `live · ${input.gone}`, castId: id },
      ...state.mine,
    ],
  };
  emit();
}

/** a cast with no explicit expiry stays up for a day. */
function defaultExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

/**
 * Pull the delivered feed from the server and replace what is on
 * screen with it.
 *
 * No-op without a backend: the fixture feed is derived at hydrate and
 * there is nothing to fetch. A failure is left to the caller — a feed
 * that silently swallows an error looks exactly like a feed with
 * nothing in it, which is the one thing it must never look like.
 */
export async function refreshFeed(): Promise<void> {
  if (!remoteEnabled()) return;
  const delivered = await fetchFeed();
  state = { ...state, feed: delivered };
  emit();
}

/** test-only reset. clears the persisted record too. */
export function resetCastStore(): void {
  skippedIds = [];
  clearState(STORAGE_KEYS.casts);
  state = {
    feed: deliverFeed(fixtureCasts),
    myCasts: fixtureCasts.filter((c) => c.byId === 'me'),
    mine: fixtureYourCasts,
    filter: null,
    query: '',
  };
  listeners.forEach((listener) => listener());
}

/**
 * compose draft: the area picker is its own screen (keyboard needs the
 * room), so it hands its answer back through here.
 */
type DraftPoint = { latitude: number; longitude: number } | null;
type Draft = { area: string; point: DraftPoint };
let draft: Draft = { area: '', point: null };
const draftListeners = new Set<() => void>();

function subscribeDraft(listener: () => void): () => void {
  draftListeners.add(listener);
  return () => draftListeners.delete(listener);
}

export function useDraftArea(): string {
  return useSyncExternalStore(subscribeDraft, () => draft.area);
}

/**
 * The pin the area picker resolved, or null when it could not place
 * the name. Published casts carry it as the area's approximate centre
 * — the server rounds it before storing, so no exact location can
 * reach a discoverable row whatever the picker hands back.
 *
 * Returns the stored reference rather than a fresh object, because a
 * new object every render would make useSyncExternalStore loop.
 */
export function useDraftAreaPoint(): DraftPoint {
  return useSyncExternalStore(subscribeDraft, () => draft.point);
}

export function setDraftArea(area: string, point: DraftPoint = null): void {
  draft = { area, point };
  draftListeners.forEach((listener) => listener());
}

export function clearDraft(): void {
  setDraftArea('');
}
