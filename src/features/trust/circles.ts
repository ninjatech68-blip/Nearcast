import { useSyncExternalStore } from 'react';

import {
  clearState,
  loadState,
  registerStoreReset,
  saveState,
  STORAGE_KEYS,
} from '@/infrastructure/persistence/storage';
import type { TrustGraph } from './domain/trust';
import {
  addToCircleRemote,
  circlesEnabled,
  createCircleRemote,
  fetchMyCircles,
  fetchVouchersOfMe,
  removeFromCircleRemote,
} from './remote-circles';

/**
 * circles are named groups of people you trust. you build them by
 * adding people you have met through the app; membership is the raw
 * material the trust graph runs on. session store for the frontend —
 * supabase circle_members table replaces it, same shape.
 *
 * privacy law: your own circle members are visible to you; membership
 * is never visible outside the circle.
 */

export type Circle = {
  id: string;
  name: string;
  memberIds: readonly string[];
  /** live-mode member details (name/area); absent in the fixture build */
  members?: readonly { id: string; name: string; area: string }[];
};

export type Person = {
  id: string;
  name: string;
  area: string;
};

export const people: Record<string, Person> = {
  me: { id: 'me', name: 'Piyush', area: 'indiranagar' },
  aarav: { id: 'aarav', name: 'Aarav', area: 'indiranagar' },
  meera: { id: 'meera', name: 'Meera', area: 'hsr' },
  dev: { id: 'dev', name: 'Dev', area: 'koramangala' },
  riya: { id: 'riya', name: 'Riya', area: 'indiranagar' },
  arjun: { id: 'arjun', name: 'Arjun', area: 'indiranagar' },
  kavya: { id: 'kavya', name: 'Kavya', area: 'koramangala' },
  nikhil: { id: 'nikhil', name: 'Nikhil', area: 'indiranagar' },
  sana: { id: 'sana', name: 'Sana', area: 'koramangala' },
  rohan: { id: 'rohan', name: 'Rohan', area: 'hsr' },
  priya: { id: 'priya', name: 'Priya', area: 'indiranagar' },
  vikram: { id: 'vikram', name: 'Vikram', area: 'koramangala' },
  neha: { id: 'neha', name: 'Neha', area: 'indiranagar' },
};

type State = {
  circles: readonly Circle[];
  /** backend caches — filled by refreshCircles / refreshVouchers */
  remoteCircles: readonly Circle[];
  remoteVouchers: readonly string[];
};

const SEED_STATE: State = {
  circles: [
    { id: 'badminton-gang', name: 'badminton gang', memberIds: ['aarav', 'riya', 'arjun'] },
    { id: 'flat-4b', name: 'flat 4b', memberIds: ['arjun'] },
    { id: 'college-crew', name: 'college crew', memberIds: ['kavya'] },
  ],
  remoteCircles: [],
  remoteVouchers: [],
};

// circles persist in full — who you vouch for is the raw material the
// trust graph runs on, and a vouch you made must outlive a restart.
let state: State = { ...SEED_STATE, ...loadState<State>(STORAGE_KEYS.circles, SEED_STATE) };

const listeners = new Set<() => void>();
const emit = () => {
  saveState(STORAGE_KEYS.circles, persistableState());
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

registerStoreReset(() => {
  state = SEED_STATE;
  listeners.forEach((l) => l());
});

function persistableState(): State {
  // never persist the server caches; they are re-fetched on load
  return { ...state, remoteCircles: [], remoteVouchers: [] };
}

/** test-only reset. clears the persisted record too. */
export function resetCirclesStore(): void {
  clearState(STORAGE_KEYS.circles);
  state = SEED_STATE;
  listeners.forEach((l) => l());
}

export function useCircles(): readonly Circle[] {
  const snapshot = useSyncExternalStore(subscribe, () => state);
  return circlesEnabled() ? snapshot.remoteCircles : snapshot.circles;
}

export function getCircles(): readonly Circle[] {
  return circlesEnabled() ? state.remoteCircles : state.circles;
}

/** the graph the trust functions run on: everyone's circle membership. */
export function trustGraph(): TrustGraph {
  const membership: Record<string, string[]> = {};
  const add = (person: string, circle: string) => {
    (membership[person] ??= []).push(circle);
  };
  // the viewer's own circles
  for (const circle of state.circles) {
    add('me', circle.id);
    for (const member of circle.memberIds) add(member, circle.id);
  }
  // fixed second-degree edges so the graph has depth to walk (in
  // production these come from other people's circle rows)
  add('meera', 'hsr-potters');
  add('aarav', 'hsr-potters');
  add('dev', 'gig-crew');
  add('meera', 'gig-crew');
  return { membership };
}

export function circlesContaining(personId: string): readonly Circle[] {
  return state.circles.filter((c) => c.memberIds.includes(personId));
}

export async function addToCircle(circleId: string, personId: string): Promise<void> {
  if (circlesEnabled()) {
    await addToCircleRemote(circleId, personId);
    await refreshCircles();
    return;
  }
  state = {
    ...state,
    circles: state.circles.map((c) =>
      c.id === circleId && !c.memberIds.includes(personId)
        ? { ...c, memberIds: [...c.memberIds, personId] }
        : c,
    ),
  };
  emit();
}

export async function removeFromCircle(circleId: string, personId: string): Promise<void> {
  if (circlesEnabled()) {
    await removeFromCircleRemote(circleId, personId);
    await refreshCircles();
    return;
  }
  state = {
    ...state,
    circles: state.circles.map((c) =>
      c.id === circleId ? { ...c, memberIds: c.memberIds.filter((id) => id !== personId) } : c,
    ),
  };
  emit();
}

export async function createCircle(name: string): Promise<string> {
  if (circlesEnabled()) {
    const id = await createCircleRemote(name);
    await refreshCircles();
    return id;
  }
  const id = `circle-${Date.now()}`;
  state = { ...state, circles: [...state.circles, { id, name: name.trim().toLowerCase(), memberIds: [] }] };
  emit();
  return id;
}

/** pull my circles (with member names) from the server. no-op offline. */
export async function refreshCircles(): Promise<void> {
  if (!circlesEnabled()) return;
  const rows = await fetchMyCircles();
  const byId = new Map<string, Circle & { members: { id: string; name: string; area: string }[] }>();
  for (const row of rows) {
    let circle = byId.get(row.circle_id);
    if (!circle) {
      circle = { id: row.circle_id, name: row.name, memberIds: [], members: [] };
      byId.set(row.circle_id, circle);
    }
    if (row.member_id) {
      (circle.memberIds as string[]).push(row.member_id);
      circle.members.push({
        id: row.member_id,
        name: row.member_first_name ?? 'someone',
        area: row.member_area ?? '',
      });
    }
  }
  state = { ...state, remoteCircles: [...byId.values()] };
  emit();
}

/** pull who vouches for me. no-op offline. */
export async function refreshVouchers(): Promise<void> {
  if (!circlesEnabled()) return;
  const names = await fetchVouchersOfMe();
  state = { ...state, remoteVouchers: names };
  emit();
}

/**
 * external circles that hold "me" — the reciprocal of add-to-circle.
 * every entry means: this person put you in one of their circles, and
 * that counts as a vouch. the circle name is never shown outside its
 * owner (privacy law), so we only expose the vouch count and the vouch
 * givers, never the circle's identity or its other members.
 * production: a `circle_members` row where `person_id = viewer.id` and
 * `owner_id != viewer.id`, filtered by RLS to what the viewer may see.
 */
type Vouch = { circleId: string; ownerId: string };

const vouches: readonly Vouch[] = [
  { circleId: 'aarav-close-court', ownerId: 'aarav' },
  { circleId: 'kavya-brunch-people', ownerId: 'kavya' },
  { circleId: 'arjun-flatmates', ownerId: 'arjun' },
];

export function circlesVouchingForMe(): number {
  return circlesEnabled() ? state.remoteVouchers.length : vouches.length;
}

export function vouchersOfMe(): readonly string[] {
  return circlesEnabled() ? state.remoteVouchers : vouches.map((v) => v.ownerId);
}

/**
 * a vouch requires evidence you know the person. right now that
 * evidence is one confirmed attendance receipt with them (the
 * attendance domain's mutual-confirm outcome). if you have not made
 * a plan real together, you cannot put them in a circle. this is the
 * product rule that stops the caster sheet from being a follow button.
 *
 * production: attendance.receipts_between(viewer, person). fixture:
 * an explicit list of people we have a confirmed receipt with.
 */
const receiptsWithMe: readonly string[] = ['aarav'];

export function hasReceiptWith(personId: string): boolean {
  return receiptsWithMe.includes(personId);
}
