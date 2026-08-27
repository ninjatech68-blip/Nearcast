import { useSyncExternalStore } from 'react';

/**
 * my profile state that changes on device: photo (gallery pick) and
 * quiet hours (start/end). session store — supabase profile row
 * replaces it, same shape.
 */

type State = {
  photoUri: string | null;
  quietHours: { start: string; end: string; on: boolean };
};

let state: State = {
  photoUri: null,
  quietHours: { start: '10:00 pm', end: '7:00 am', on: true },
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useMyPhoto(): string | null {
  return useSyncExternalStore(subscribe, () => state.photoUri);
}

export function setMyPhoto(uri: string | null): void {
  state = { ...state, photoUri: uri };
  emit();
}

export function useQuietHours() {
  return useSyncExternalStore(subscribe, () => state.quietHours);
}

export function setQuietHours(next: Partial<State['quietHours']>): void {
  state = { ...state, quietHours: { ...state.quietHours, ...next } };
  emit();
}

export function resetMeStore(): void {
  state = {
    photoUri: null,
    quietHours: { start: '10:00 pm', end: '7:00 am', on: true },
  };
  emit();
}
