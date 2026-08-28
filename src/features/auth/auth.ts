import { getSupabase, isBackendConfigured } from '@/infrastructure/supabase/client';
import { setSignedIn, signOut as clearLocalSession } from '@/features/me/me-store';

/**
 * Auth: one-time codes, by email or phone. No passwords, ever.
 *
 * Two modes, decided by whether a backend is configured:
 *
 *   CONFIGURED   — real supabase.auth.signInWithOtp / verifyOtp. A
 *                  code is genuinely sent and genuinely checked.
 *   UNCONFIGURED — the local path the app shipped with: entering an
 *                  address signs you in immediately. This keeps the
 *                  fixture build demoable while the stores are ported.
 *
 * Callers never branch on the mode. They get the same tagged results
 * either way, so the signin screen has one code path and the
 * difference is invisible above this file.
 */

export type AuthChannel = 'email' | 'phone';

export type SendResult =
  | { ok: true; needsCode: boolean }
  | { ok: false; message: string };

export type VerifyResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Supabase surfaces a lot of failure modes. Turning them into
 * something a person can act on is worth doing here rather than in
 * the screen, so every entry point says the same thing about the
 * same problem.
 */
function readableError(error: unknown, channel: AuthChannel): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const lowered = raw.toLowerCase();

  if (lowered.includes('rate') || lowered.includes('too many')) {
    return 'too many tries. wait a minute and ask for a new code.';
  }
  if (lowered.includes('expired')) {
    return 'that code expired. ask for a new one.';
  }
  if (lowered.includes('invalid') && lowered.includes('token')) {
    return "that code didn't match. check it and try again.";
  }
  if (lowered.includes('invalid') || lowered.includes('not valid')) {
    return channel === 'phone'
      ? "that number doesn't look right. include the country code."
      : "that address doesn't look right.";
  }
  if (lowered.includes('network') || lowered.includes('fetch')) {
    return "couldn't reach the server. check your connection.";
  }
  return raw.trim().length > 0 ? raw : 'something went wrong. try again.';
}

/** send a one-time code. `needsCode` is false in local mode, where sending signs you straight in. */
export async function sendCode(channel: AuthChannel, address: string): Promise<SendResult> {
  const client = getSupabase();
  const value = address.trim();

  if (!client) {
    // local mode: no code to send, the address IS the sign-in
    setSignedIn(value);
    return { ok: true, needsCode: false };
  }

  try {
    const { error } =
      channel === 'email'
        ? await client.auth.signInWithOtp({ email: value })
        : await client.auth.signInWithOtp({ phone: value });
    if (error) return { ok: false, message: readableError(error, channel) };
    return { ok: true, needsCode: true };
  } catch (error) {
    return { ok: false, message: readableError(error, channel) };
  }
}

/** check the code the user typed and open a session. */
export async function verifyCode(
  channel: AuthChannel,
  address: string,
  code: string,
): Promise<VerifyResult> {
  const client = getSupabase();
  const value = address.trim();

  if (!client) {
    setSignedIn(value);
    return { ok: true };
  }

  try {
    const { data, error } =
      channel === 'email'
        ? await client.auth.verifyOtp({ email: value, token: code.trim(), type: 'email' })
        : await client.auth.verifyOtp({ phone: value, token: code.trim(), type: 'sms' });

    if (error) return { ok: false, message: readableError(error, channel) };
    if (!data.session) return { ok: false, message: 'that code did not open a session. try again.' };

    setSignedIn(value);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: readableError(error, channel) };
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

/** whether a code step is part of the flow at all. drives the signin copy. */
export function requiresCode(): boolean {
  return isBackendConfigured();
}
