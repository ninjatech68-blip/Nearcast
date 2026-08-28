import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { isLocalNetworkUrl, parsePublicEnv } from '@/infrastructure/config/env';
import type { Database } from '@/infrastructure/supabase/database.types';

/**
 * The Supabase client, resolved LAZILY and OPTIONALLY.
 *
 * Both of those matter. The env parser throws on a missing or
 * malformed variable — which is correct — but reading it at module
 * load meant importing this file without a .env crashed the app on
 * launch, before any screen could say why.
 *
 * More importantly the app has to run in two modes during the
 * backend migration:
 *
 *   CONFIGURED   — a real Supabase project. Auth, and eventually
 *                  every store, talks to it.
 *   UNCONFIGURED — no .env. The app runs entirely on the local
 *                  fixture stores, exactly as it does today.
 *
 * Keeping unconfigured working is not a nicety: it is how the app
 * stays demoable and testable while the stores are ported one at a
 * time, and it is why every caller must handle a null client rather
 * than assume one.
 */

export type NearcastClient = SupabaseClient<Database>;

type Resolution = { client: NearcastClient | null; reason: string };

let resolved: Resolution | null = null;

function resolve(): Resolution {
  try {
    const env = parsePublicEnv({
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    });

    // Installs a localStorage polyfill backed by expo-sqlite, so the
    // auth session survives a restart the way our own stores do.
    // Deliberately required HERE and not imported at module scope:
    // the install opens a native database immediately, which crashes
    // anywhere the native module is absent (jest, vitest, web). There
    // is no reason to pay that cost when there is no client to use it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-sqlite/localStorage/install');

    const client = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        // magic links come back as a deep link the app opens itself, so
        // there is no browser URL for the client to read — we hand it
        // the code and exchange it manually. PKCE is required for that
        // exchange, and stores the verifier in `storage` above so it
        // survives the round-trip out to email and back.
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });

    // A home-network Supabase URL is the usual cause of "works next to
    // my Mac, dead everywhere else": the app can only reach it on that
    // LAN. Keep it working for local dev, but make it impossible to miss.
    if (isLocalNetworkUrl(env.supabaseUrl)) {
      const warning =
        `Supabase URL ${env.supabaseUrl} is a home-network address — the ` +
        `app will only work on the same Wi-Fi. Point EXPO_PUBLIC_SUPABASE_URL ` +
        `at your hosted https://<project-ref>.supabase.co and rebuild.`;
      // eslint-disable-next-line no-console
      console.warn(`[nearcast] ${warning}`);
      return { client, reason: warning };
    }

    return { client, reason: `connected to ${env.supabaseUrl}` };
  } catch {
    return { client: null, reason: 'no EXPO_PUBLIC_SUPABASE_* config — running on local fixtures' };
  }
}

function resolution(): Resolution {
  resolved ??= resolve();
  return resolved;
}

/** The client, or null when no backend is configured. */
export function getSupabase(): NearcastClient | null {
  return resolution().client;
}

/** true when a backend is configured and reachable in principle. */
export function isBackendConfigured(): boolean {
  return resolution().client !== null;
}

/** Human-readable, for the dev diagnostics row on the you sheet. */
export function backendStatus(): string {
  return resolution().reason;
}

/** test-only: forget the memoised resolution so env changes take effect. */
export function resetSupabaseClient(): void {
  resolved = null;
}
