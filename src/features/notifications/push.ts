/**
 * Push registration — the device side of notifications.
 *
 * Behind a guarded require so the app builds and the test/CI environment
 * runs whether or not the native `expo-notifications` module is present.
 * It is added to the binary by `npx expo install expo-notifications` +
 * prebuild; it is absent in the headless environment, where every call
 * here degrades to a safe no-op.
 *
 * Privacy: this file only asks permission and registers a device token.
 * What a notification SAYS is decided server-side and, by product law,
 * carries no intent text, message, coordinate, contact detail or
 * private-group name — only a type and ids. See supabase/functions/send-push.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { tokens } from '@/design-system/tokens';
import { getSupabase } from '@/infrastructure/supabase/client';

type PermissionResult = { status: string; granted?: boolean; canAskAgain?: boolean };
type NotificationsLike = {
  getPermissionsAsync: () => Promise<PermissionResult>;
  requestPermissionsAsync: () => Promise<PermissionResult>;
  getExpoPushTokenAsync: (opts?: { projectId?: string }) => Promise<{ data: string }>;
  setNotificationHandler: (handler: unknown) => void;
  setNotificationChannelAsync: (id: string, channel: unknown) => Promise<unknown>;
  AndroidImportance: { DEFAULT: number; HIGH: number };
};

let Notifications: NotificationsLike | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications') as NotificationsLike;
} catch {
  Notifications = null;
}

/** true when the native module is in the binary. */
export function pushAvailable(): boolean {
  return Notifications !== null;
}

function projectId(): string | undefined {
  const extra = (Constants.expoConfig?.extra ?? {}) as { eas?: { projectId?: string } };
  const eas = (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig;
  return extra.eas?.projectId ?? eas?.projectId;
}

/**
 * Foreground presentation + a branded Android channel. Safe to call at
 * boot and idempotent.
 */
export async function configureNotifications(): Promise<void> {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Nearcast',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: tokens.semantic.color.accent,
    });
  }
}

export type PushOutcome = 'granted' | 'denied' | 'unsupported';

/**
 * Ask permission and, if granted, register this device's push token with
 * the backend. Returns what happened so the caller can persist the grant.
 * Never throws — push is a convenience, not a gate on getting into the app.
 */
export async function enablePush(): Promise<PushOutcome> {
  if (!Notifications) return 'unsupported';
  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted ?? existing.status === 'granted';
    if (!granted && existing.canAskAgain !== false) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted ?? asked.status === 'granted';
    }
    if (!granted) return 'denied';
    await configureNotifications();
    await registerToken();
    return 'granted';
  } catch {
    return 'denied';
  }
}

/** Re-register on launch when already granted — tokens can rotate. No-op otherwise. */
export async function refreshPushRegistration(): Promise<void> {
  if (!Notifications) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!(perm.granted ?? perm.status === 'granted')) return;
    await configureNotifications();
    await registerToken();
  } catch {
    // best-effort background upkeep
  }
}

/** Fetch the Expo push token and store it against the signed-in user. */
async function registerToken(): Promise<void> {
  if (!Notifications) return;
  const client = getSupabase();
  if (!client) return; // no backend: nothing to register against
  try {
    const pid = projectId();
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      pid ? { projectId: pid } : undefined,
    );
    if (!token) return;
    await client.rpc('register_push_token', { token, platform: Platform.OS });
  } catch {
    // a missing projectId or a transient failure must not turn a granted
    // permission into a denial; the next launch re-tries registration.
  }
}
