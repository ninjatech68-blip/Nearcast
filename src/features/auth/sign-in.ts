import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/infrastructure/supabase/client';

/**
 * Google and Apple are the only approved authentication methods for the closed
 * alpha (MVP Requirement MUST-001). Errors are deliberately generic so a caller
 * cannot use sign-in to discover whether an account exists.
 */
export const AUTH_PROVIDERS = ['google', 'apple'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export const GENERIC_SIGN_IN_ERROR =
  'We could not sign you in. Check your connection and try again.';

export type SignInResult = { ok: true } | { ok: false; message: string };

export function authRedirectUrl(): string {
  return Linking.createURL('auth-callback');
}

export async function signInWithProvider(provider: AuthProvider): Promise<SignInResult> {
  const redirectTo = authRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error || !data?.url) {
    return { ok: false, message: GENERIC_SIGN_IN_ERROR };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    // A cancelled sheet is not a failure worth alarming the user about.
    return result.type === 'cancel' || result.type === 'dismiss'
      ? { ok: false, message: '' }
      : { ok: false, message: GENERIC_SIGN_IN_ERROR };
  }

  const code = new URL(result.url).searchParams.get('code');
  if (!code) {
    return { ok: false, message: GENERIC_SIGN_IN_ERROR };
  }

  const exchange = await supabase.auth.exchangeCodeForSession(code);
  return exchange.error ? { ok: false, message: GENERIC_SIGN_IN_ERROR } : { ok: true };
}

export type RedeemResult = { ok: true } | { ok: false; message: string };

export const GENERIC_INVITE_ERROR =
  'That invitation is not valid. Ask whoever invited you for a new link.';

export async function redeemInvitation(
  inviteToken: string,
  displayName: string,
): Promise<RedeemResult> {
  const trimmedName = displayName.trim();
  if (trimmedName.length === 0 || trimmedName.length > 60) {
    return { ok: false, message: 'Enter the name you want other people to see.' };
  }

  const { error } = await supabase.rpc('redeem_invite', {
    invite_token: inviteToken.trim(),
    chosen_display_name: trimmedName,
  });

  // The server returns one error for unknown, expired and consumed tokens.
  // The client must not add detail the server deliberately withheld.
  return error ? { ok: false, message: GENERIC_INVITE_ERROR } : { ok: true };
}
