import * as Linking from 'expo-linking';

import { getSupabase, isBackendConfigured } from '@/infrastructure/supabase/client';
import { hydrateReturningProfile, setSignedIn, signOut as clearLocalSession } from '@/features/me/me-store';
import { fetchOwnProfile } from '@/features/me/profile-sync';

/**
 * Auth: passwordless email MAGIC LINK. No passwords, no codes to type.
 *
 * The flow: enter email → Supabase emails a link → tapping it opens
 * NearCast via a deep link → we complete a PKCE code exchange and the
 * session is established and persisted. There is no OTP to copy.
 *
 * Two modes, decided by whether a backend is configured, and the
 * screen can't tell them apart:
 *
 *   CONFIGURED   — real supabase.auth.signInWithOtp (magic link) +
 *                  exchangeCodeForSession on the callback.
 *   UNCONFIGURED — the local path the fixture build ships with:
 *                  entering an address signs you in immediately, so the
 *                  app stays demoable with no backend.
 */

export type AuthChannel = 'email';

export type SendResult =
  | { ok: true; sent: boolean } // sent:false = local mode signed in immediately
  | { ok: false; message: string };

export type CallbackResult = { ok: true } | { ok: false; message: string };

/**
 * The deep link the magic link comes back to. `createURL` yields the
 * app's own scheme — `nearcast://auth/callback` in a native build — so
 * the same code works whether the callback arrives over the custom
 * scheme or a future Universal Link / App Link on the same path.
 */
export function authRedirectUrl(): string {
  return Linking.createURL('auth/callback');
}

/**
 * A rejected magic link, in words.
 *
 * Supabase does not fail a bad link at the code exchange. It rejects the
 * verify itself and redirects back to the app with `error`, `error_code`
 * and `error_description` in the URL — so the reason is handed to us and
 * the callback screen used to print one fixed sentence over the top of
 * it. "That sign-in link didn't work" is true of every cause and useful
 * for none.
 *
 * `otp_expired` is the one worth naming properly. It is what comes back
 * for a link that was already CONSUMED, which in practice means one of
 * two things and rarely the passage of time: a newer request invalidated
 * it, or a corporate mail scanner fetched the URL on delivery and spent
 * the single use before anyone tapped it. Saying "expired" to someone
 * holding an email that arrived ten seconds ago reads as a lie, and
 * sends them to request another link — which is exactly the loop that
 * will fail again.
 */
export function describeCallbackError(params: {
  error?: string;
  error_code?: string;
  error_description?: string;
}): string {
  const code = (params.error_code ?? '').toLowerCase();
  const description = (params.error_description ?? '').toLowerCase();
  const kind = (params.error ?? '').toLowerCase();

  if (code.includes('otp_expired') || description.includes('invalid or has expired')) {
    return 'that link was already used, or a newer one replaced it. ask for a new one and open only the latest email.';
  }
  if (code.includes('expired') || description.includes('expired')) {
    return 'that link expired. ask for a new one.';
  }
  if (kind.includes('access_denied') || code.includes('access_denied')) {
    return 'that link is no longer valid. ask for a new one.';
  }
  return 'that sign-in link didn\u2019t work. ask for a new one.';
}

/** Supabase failure modes → something a person can act on. */
function readableError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const lowered = raw.toLowerCase();

  if (lowered.includes('rate') || lowered.includes('too many')) {
    return 'too many tries. wait a minute, then ask for a new link.';
  }
  if (lowered.includes('expired')) {
    return 'that link expired. ask for a new one.';
  }
  // login mode against an address with no account yet
  if (
    lowered.includes('signups not allowed') ||
    lowered.includes('user not found') ||
    lowered.includes('no user')
  ) {
    return 'no account with that email yet. switch to sign up to create one.';
  }
  if (lowered.includes('invalid') || lowered.includes('not valid') || lowered.includes('otp')) {
    return 'that link is no longer valid. ask for a new one.';
  }
  if (lowered.includes('network') || lowered.includes('fetch')) {
    return "couldn't reach the server. check your connection.";
  }
  if (lowered.includes('email') && lowered.includes('valid')) {
    return "that address doesn't look right.";
  }
  // the built-in email service refused / failed to send (usually SMTP not
  // configured, or a rate cap) — do not echo the raw provider string.
  if (lowered.includes('sending') || (lowered.includes('email') && lowered.includes('error'))) {
    return "we couldn't send the link right now. try again in a moment.";
  }
  return raw.trim().length > 0 ? raw : 'something went wrong. try again.';
}

/**
 * Send a magic link. In local mode there is no link to send — the
 * address IS the sign-in — so `sent` comes back false and the caller
 * routes straight on.
 */
export async function sendMagicLink(
  email: string,
  opts: { createUser?: boolean } = {},
): Promise<SendResult> {
  const client = getSupabase();
  const value = email.trim();
  // sign up creates the account if new; log in only sends a link when an
  // account already exists (so an unknown email is told to sign up).
  const shouldCreateUser = opts.createUser ?? true;

  if (!client) {
    setSignedIn(value);
    return { ok: true, sent: false };
  }

  try {
    const { error } = await client.auth.signInWithOtp({
      email: value,
      options: {
        emailRedirectTo: authRedirectUrl(),
        shouldCreateUser,
      },
    });
    if (error) return { ok: false, message: readableError(error) };
    return { ok: true, sent: true };
  } catch (error) {
    return { ok: false, message: readableError(error) };
  }
}

/**
 * True when a URL is the auth callback we should try to complete.
 * Matches our own callback path, and defensively any URL that already
 * carries an auth code or error, so a link that lands slightly
 * differently is still handled.
 */
export function isAuthCallbackUrl(url: string): boolean {
  if (!url) return false;
  if (url.includes('auth/callback')) return true;
  return url.includes('code=') || url.includes('error=') || url.includes('access_token=');
}

/**
 * Complete auth from the callback URL: exchange the PKCE code for a
 * session (the code_verifier was stored on this device when the link
 * was requested), or surface an expired/invalid link clearly. On
 * success the session is persisted by the client and the identity is
 * written to the local store, so the shell's gate routes to Home.
 */
export async function completeAuthFromUrl(url: string): Promise<CallbackResult> {
  const client = getSupabase();
  if (!client) return { ok: true }; // local mode has no links to complete

  // an errored link comes back with error params rather than a code
  const parsed = Linking.parse(url);
  const params = { ...(parsed.queryParams ?? {}) } as Record<string, string | undefined>;
  // Supabase can put error/token in the fragment; parse that too
  const hashIndex = url.indexOf('#');
  if (hashIndex >= 0) {
    for (const pair of url.slice(hashIndex + 1).split('&')) {
      const eq = pair.indexOf('=');
      const k = eq >= 0 ? pair.slice(0, eq) : pair;
      const v = eq >= 0 ? pair.slice(eq + 1) : '';
      if (k) params[k] = decodeURIComponent(v);
    }
  }

  if (params.error || params.error_description) {
    return { ok: false, message: readableError(params.error_description ?? params.error) };
  }

  const code = params.code;
  if (!code) {
    return { ok: false, message: 'that link is no longer valid. ask for a new one.' };
  }
  return exchangeAuthCode(code);
}

/**
 * Exchange a PKCE `code` for a session. The callback route calls this
 * directly with the `code` query param expo-router hands it, so the
 * whole flow lands on a real screen instead of an unmatched route.
 */
/**
 * After sign-in, pull the user's own profile and, if it is already
 * complete, restore it locally and skip onboarding. Best-effort: a
 * failure here just means the shell may show onboarding, which is
 * recoverable, so it never blocks the sign-in it follows.
 */
async function restoreOnboardingState(): Promise<void> {
  try {
    const profile = await fetchOwnProfile();
    if (profile) hydrateReturningProfile(profile);
  } catch {
    // leave onboarding to run; better a repeated step than a failed login
  }
}

export async function exchangeAuthCode(code: string): Promise<CallbackResult> {
  const client = getSupabase();
  if (!client) return { ok: true };
  try {
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error) return { ok: false, message: readableError(error) };
    const user = data.session?.user;
    if (!user) return { ok: false, message: 'that link did not open a session. ask for a new one.' };
    setSignedIn(user.email ?? user.id);
    await restoreOnboardingState();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: readableError(error) };
  }
}

/**
 * Restore a session at launch. Returns the signed-in identity, or
 * null. Called once by the shell before it decides where to route.
 */
export async function restoreSession(): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null; // local mode: the me-store already knows

  try {
    const { data } = await client.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    const identity = user.email ?? user.phone ?? user.id;
    setSignedIn(identity);
    await restoreOnboardingState();
    return identity;
  } catch {
    return null;
  }
}

/**
 * Sign out. The local wipe runs whether or not the remote call
 * succeeds — a device that failed to reach the server must still not
 * be left holding the last person's data.
 */
export async function signOut(): Promise<void> {
  const client = getSupabase();
  try {
    await client?.auth.signOut();
  } catch {
    // fall through: the local wipe is the part that protects the user
  }
  clearLocalSession();
}

/** whether a real backend (and therefore a real emailed link) is in play. */
export function requiresLink(): boolean {
  return isBackendConfigured();
}
