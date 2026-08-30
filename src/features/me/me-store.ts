import { useMemo, useSyncExternalStore } from 'react';

import type { Category } from '@/design-system/tokens';
import type { ViewerContext } from '@/features/casts/domain/delivery';
import { clearAllState, loadState, saveState, STORAGE_KEYS } from '@/infrastructure/persistence/storage';

/**
 * the me store: the source of truth for who I am on device — name,
 * home area, approved neighborhoods, interests, blocked casters, quiet
 * hours, photo, and the gates the shell reads (signed in? onboarded?
 * push granted?). PERSISTED, so a restart keeps you signed in and
 * onboarded; supabase profile + contact_preferences replace it in the
 * backend phase, same shape.
 *
 * production: profile row (RLS-scoped to the viewer) + a small
 * private_state table for blocked ids and push preferences.
 */

type QuietHours = { start: string; end: string; on: boolean };

/**
 * The approximate centre of an approved area, as the picker resolved
 * it. Optional because the seeded defaults predate the picker and
 * because a name can always be added without one — delivery falls
 * back to matching the name, which is coarse but never silently goes
 * quiet.
 */
export type AreaPoint = { latitude: number; longitude: number };

type State = {
  signedIn: boolean;
  onboardingDone: boolean;
  pushGranted: boolean | null; // null = never asked
  name: string;
  email: string;
  homeArea: string;
  approvedAreas: readonly string[];
  /** name -> approximate centre, for the areas the picker could place */
  areaPoints: Readonly<Record<string, AreaPoint>>;
  interests: readonly Category[];
  blocked: readonly string[];
  photoUri: string | null;
  quietHours: QuietHours;
};

const DEFAULT_STATE: State = {
  signedIn: false,
  onboardingDone: false,
  pushGranted: null,
  name: '',
  email: '',
  homeArea: 'indiranagar',
  approvedAreas: ['indiranagar', 'koramangala', 'hsr'],
  areaPoints: {},
  interests: ['sports', 'games', 'arts'],
  blocked: [],
  photoUri: null,
  quietHours: { start: '10:00 pm', end: '7:00 am', on: true },
};

// hydrate synchronously at module load so the shell's signed-in /
// onboarded gate reads the real value on the very first render.
let state: State = { ...DEFAULT_STATE, ...loadState(STORAGE_KEYS.me, {}) };

const listeners = new Set<() => void>();
const emit = () => {
  saveState(STORAGE_KEYS.me, state);
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useMe(): State {
  return useSyncExternalStore(subscribe, () => state);
}

/** the read-only viewer view the delivery framework uses. */
function buildViewerContext(from: State): ViewerContext {
  return {
    areas: from.approvedAreas,
    // circles come from the trust store, not here — leaving as fixture
    circleIds: ['badminton-gang', 'flat-4b', 'college-crew'],
    adjacentCircleIds: ['kavya-friends', 'dev-music-people'],
    interests: from.interests,
    activeWindows: ['weekday-evening'],
    blockedCasterIds: from.blocked,
  };
}

export function useViewerContext(): ViewerContext {
  const me = useMe();
  return useMemo(() => buildViewerContext(me), [me]);
}

/** non-reactive snapshot, for imperative callers (e.g. feed counts). */
export function viewerContextSnapshot(): ViewerContext {
  return buildViewerContext(state);
}

export function useMyPhoto(): string | null {
  return useSyncExternalStore(subscribe, () => state.photoUri);
}

export function setMyPhoto(uri: string | null): void {
  state = { ...state, photoUri: uri };
  emit();
}

export function useQuietHours(): QuietHours {
  return useSyncExternalStore(subscribe, () => state.quietHours);
}

export function setQuietHours(next: Partial<QuietHours>): void {
  state = { ...state, quietHours: { ...state.quietHours, ...next } };
  emit();
}

/** onboarding + auth transitions */
export function setSignedIn(email: string): void {
  state = { ...state, signedIn: true, email };
  emit();
}

/**
 * Non-hook reads of the current state, for code and tests that need a
 * value outside React's render cycle (the auth flow, unit tests). The
 * hooks above stay the way components read it.
 */
export function isOnboardingDone(): boolean {
  return state.onboardingDone;
}

export function currentName(): string {
  return state.name;
}

export function setOnboardingDone(): void {
  state = { ...state, onboardingDone: true };
  emit();
}

/**
 * Apply a returning user's profile pulled from the backend, in one
 * write.
 *
 * Onboarding is a ONE-TIME setup, but "done" was only ever a flag on
 * THIS device — so a returning user on a new phone, or after a
 * reinstall, was shown the whole flow again. When sign-in finds a
 * profile that already carries a name and at least one area, that setup
 * is already complete: fill the local store from it and mark it done,
 * so the shell routes them straight to the feed.
 *
 * Only fields the server owns are touched. The photo is device-local
 * and is left as-is.
 */
export function hydrateReturningProfile(profile: {
  name: string;
  approvedAreas: readonly string[];
  areaPoints?: Readonly<Record<string, AreaPoint>>;
  interests?: readonly Category[];
}): void {
  const areas = profile.approvedAreas.filter((a) => a.trim().length > 0);
  state = {
    ...state,
    name: profile.name.trim() || state.name,
    approvedAreas: areas.length > 0 ? areas : state.approvedAreas,
    homeArea: areas[0] ?? state.homeArea,
    areaPoints: profile.areaPoints ?? state.areaPoints,
    interests: profile.interests && profile.interests.length > 0 ? profile.interests : state.interests,
    onboardingDone: true,
  };
  emit();
}

/**
 * sign out wipes EVERY persisted store, not just this one. leaving a
 * signed-out device holding the last person's casts, chats, receipts
 * and circles would be a privacy failure — the next sign-in must
 * start from nothing.
 */
export function signOut(): void {
  clearAllState();
  state = { ...DEFAULT_STATE, signedIn: false, onboardingDone: false };
  emit();
}

/** profile fields the onboarding + settings screens write to */
export function setName(name: string): void {
  state = { ...state, name };
  emit();
}

/**
 * Onboarding's home step. Replaces the approved list rather than
 * appending to it: the defaults are a demo seed, and someone in
 * Chandigarh who kept them would be delivered casts from Bangalore.
 * This is the moment they tell us where they actually are.
 */
export function setHomeAreaFromOnboarding(homeArea: string, point?: AreaPoint | null): void {
  const trimmed = homeArea.trim().toLowerCase();
  if (!trimmed) return;
  state = {
    ...state,
    homeArea: trimmed,
    approvedAreas: [trimmed],
    areaPoints: point ? { [trimmed]: point } : {},
  };
  emit();
}

export function setHomeArea(homeArea: string): void {
  state = { ...state, homeArea };
  emit();
}

export function setApprovedAreas(areas: readonly string[]): void {
  state = { ...state, approvedAreas: areas };
  emit();
}

export function addApprovedArea(area: string, point?: AreaPoint | null): void {
  const trimmed = area.trim().toLowerCase();
  if (!trimmed) return;
  // a name already on the list can still gain a point: someone who
  // typed it before the picker existed should get a real centroid the
  // first time they pick it properly.
  const nextPoints = point
    ? { ...state.areaPoints, [trimmed]: point }
    : state.areaPoints;
  if (state.approvedAreas.includes(trimmed)) {
    if (nextPoints === state.areaPoints) return;
    state = { ...state, areaPoints: nextPoints };
    emit();
    return;
  }
  state = { ...state, approvedAreas: [...state.approvedAreas, trimmed], areaPoints: nextPoints };
  emit();
}

export function removeApprovedArea(area: string): void {
  const { [area]: _removed, ...remainingPoints } = state.areaPoints;
  state = {
    ...state,
    approvedAreas: state.approvedAreas.filter((a) => a !== area),
    areaPoints: remainingPoints,
  };
  emit();
}

export function setInterests(interests: readonly Category[]): void {
  state = { ...state, interests };
  emit();
}

/** blocked list — a blocked caster's casts vanish from your feed via delivery. */
export function blockCaster(personId: string): void {
  if (state.blocked.includes(personId)) return;
  state = { ...state, blocked: [...state.blocked, personId] };
  emit();
}

export function unblockCaster(personId: string): void {
  state = { ...state, blocked: state.blocked.filter((id) => id !== personId) };
  emit();
}

/**
 * push permission stub. the real implementation will call
 * expo-notifications; today it just flips a flag so the flow shape is
 * real. the me-store field is what push wiring reads to decide whether
 * to enqueue.
 */
export function setPushGranted(granted: boolean): void {
  state = { ...state, pushGranted: granted };
  emit();
}

export function resetMeStore(): void {
  state = DEFAULT_STATE;
  emit();
}

/** test-only: skip signin + onboarding so component tests land on the app. */
export function testOnly_bypassGates(): void {
  state = { ...DEFAULT_STATE, signedIn: true, onboardingDone: true };
  emit();
}
