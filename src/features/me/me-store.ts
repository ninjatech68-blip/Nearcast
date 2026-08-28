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

type State = {
  signedIn: boolean;
  onboardingDone: boolean;
  pushGranted: boolean | null; // null = never asked
  name: string;
  email: string;
  homeArea: string;
  approvedAreas: readonly string[];
  interests: readonly Category[];
  blocked: readonly string[];
  photoUri: string | null;
  quietHours: QuietHours;
};

const DEFAULT_STATE: State = {
  signedIn: false,
  onboardingDone: false,
  pushGranted: null,
  name: 'Piyush',
  email: '',
  homeArea: 'indiranagar',
  approvedAreas: ['indiranagar', 'koramangala', 'hsr'],
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
export function useViewerContext(): ViewerContext {
  const me = useMe();
  return useMemo(
    () => ({
      areas: me.approvedAreas,
      // circles come from the trust store, not here — leaving as fixture
      circleIds: ['badminton-gang', 'flat-4b', 'college-crew'],
      adjacentCircleIds: ['kavya-friends', 'dev-music-people'],
      interests: me.interests,
      activeWindows: ['weekday-evening'],
      blockedCasterIds: me.blocked,
    }),
    [me],
  );
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

export function setOnboardingDone(): void {
  state = { ...state, onboardingDone: true };
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

export function setHomeArea(homeArea: string): void {
  state = { ...state, homeArea };
  emit();
}

export function setApprovedAreas(areas: readonly string[]): void {
  state = { ...state, approvedAreas: areas };
  emit();
}

export function addApprovedArea(area: string): void {
  const trimmed = area.trim().toLowerCase();
  if (!trimmed || state.approvedAreas.includes(trimmed)) return;
  state = { ...state, approvedAreas: [...state.approvedAreas, trimmed] };
  emit();
}

export function removeApprovedArea(area: string): void {
  state = { ...state, approvedAreas: state.approvedAreas.filter((a) => a !== area) };
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
