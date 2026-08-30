import 'expo-sqlite/localStorage/install';

import type { DraftStore } from '@/features/intents/create/domain/draft-storage';

/**
 * The device-local draft store. Backed by expo-sqlite's localStorage shim, the
 * same durable store the Supabase session uses, so a draft survives an app
 * restart and an offline period. Nothing here leaves the device.
 */
export const deviceDraftStore: DraftStore = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};
