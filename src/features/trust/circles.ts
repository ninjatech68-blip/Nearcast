import { useSyncExternalStore } from 'react';

import type { TrustGraph } from './domain/trust';

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
};

type State = { circles: readonly Circle[] };

let state: State = {
  circles: [
    { id: 'badminton-gang', name: 'badminton gang', memberIds: ['aarav', 'riya', 'arjun'] },
    { id: 'flat-4b', name: 'flat 4b', memberIds: ['arjun'] },
    { id: 'college-crew', name: 'college crew', memberIds: ['kavya'] },
  ],
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useCircles(): readonly Circle[] {
  return useSyncExternalStore(subscribe, () => state.circles);
}

export function getCircles(): readonly Circle[] {
  return state.circles;
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

export function addToCircle(circleId: string, personId: string): void {
  state = {
    circles: state.circles.map((c) =>
      c.id === circleId && !c.memberIds.includes(personId)
        ? { ...c, memberIds: [...c.memberIds, personId] }
        : c,
    ),
  };
  emit();
}

export function removeFromCircle(circleId: string, personId: string): void {
  state = {
    circles: state.circles.map((c) =>
      c.id === circleId ? { ...c, memberIds: c.memberIds.filter((id) => id !== personId) } : c,
    ),
  };
  emit();
}

export function createCircle(name: string): string {
  const id = `circle-${Date.now()}`;
  state = { circles: [...state.circles, { id, name: name.trim().toLowerCase(), memberIds: [] }] };
  emit();
  return id;
}
