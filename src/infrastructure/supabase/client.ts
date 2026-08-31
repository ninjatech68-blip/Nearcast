import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  classifyPublicEnv,
  isLocalNetworkUrl,
  type BackendMode,
} from '@/infrastructure/config/env';
import type { Database } from '@/infrastructure/supabase/database.types';

/**
 * The Supabase client, resolved LAZILY and OPTIONALLY.
 *
 * Both of those matter. The env parser throws on a missing or
 * malformed variable — which is correct — but reading it at module
 * load meant importing this file without a .env crashed the app on
 * launch, before any screen could say why.
 *
 * There are three modes, not two, and the difference matters:
 *
 *   LIVE          — a real Supabase project. Auth and the stores talk
 *                   to it.
 *   FIXTURES      — nothing configured at all. The app runs on local
 *                   fixture stores. Legitimate for the test suites and
 *                   for working on a screen offline; refused in a
 *                   release build, because a tester cannot tell fixture
 *                   data from real activity.
 *   MISCONFIGURED — something was configured and is wrong. Never
 *                   answered with fixtures, in any build.
 *
 * Fixtures are why every caller must handle a null client rather than
 * assume one. `backendMode()` is how the release gate tells the last two
 * apart, which the old code could not: it read every parse failure as
 * "no backend" and served invented data over a valid project URL.
 */

export type NearcastClient = SupabaseClient<Database>;

type Resolution = {
  client: NearcastClient | null;
  reason: string;
  mode: BackendMode;
};

let resolved: Resolution | null = null;

function resolve(): Resolution {
  // Classify the env FIRST. Absent and invalid are different answers, and
  // conflating them is what let a typo serve fabricated data: every parse
  // failure used to be read as "no backend", so a misspelled APP_ENV beside
  // a real project URL quietly became a fixture build.
  const classified = classifyPublicEnv({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  });

  if (classified.kind === 'absent') {
    return {
      client: null,
      mode: 'fixtures',
      reason: 'no EXPO_PUBLIC_SUPABASE_* config — running on local fixtures',
    };
  }

  if (classified.kind === 'invalid') {
    const message = classified.problems.join('; ');
    console.error(`[nearcast] backend config is invalid: ${message}`);

    // Deliberately NOT 'fixtures'. Someone meant to configure a backend and
    // got it wrong; answering with invented data hides the mistake behind a
    // working-looking app.
    return { client: null, mode: 'misconfigured', reason: message };
  }

  const env = classified.env;

  // From here the backend IS configured. If client creation fails, that
  // is a real error — surface it, and do NOT silently serve fabricated
  // fixtures to a user who configured a real backend.
  try {
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
      console.warn(`[nearcast] ${warning}`);
      return { client, mode: 'live', reason: warning };
    }

    return { client, mode: 'live', reason: `connected to ${env.supabaseUrl}` };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const message = `backend is configured but the client failed to start: ${detail}`;
    console.error(`[nearcast] ${message}`);
    return { client: null, mode: 'misconfigured', reason: message };
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

/**
 * Live, fixtures, or misconfigured. The release gate reads this to decide
 * whether the app may run at all.
 */
export function backendMode(): BackendMode {
  return resolution().mode;
}

/** test-only: forget the memoised resolution so env changes take effect. */
export function resetSupabaseClient(): void {
  resolved = null;
}
