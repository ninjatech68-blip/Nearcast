import type { RedeemOutcome } from '@/features/auth/domain/membership';
import { deviceDraftStore } from '@/features/intents/create/data/device-draft-store';
import { clearDraft } from '@/features/intents/create/domain/draft-storage';
import { supabase } from '@/infrastructure/supabase/client';

/**
 * Authentication and invitation redemption.
 *
 * Sign-in creates a Supabase identity; it does not grant membership. Only
 * `redeem_invite` creates a profile, and it is the sole path that can, because
 * the client insert policy on `profiles` was removed. That keeps "is a member"
 * a server-owned fact rather than something the app decides.
 */

export async function requestSignInCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error !== null) throw error;
}

export async function verifySignInCode(
  email: string,
  code: string,
): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  });

  if (error !== null) throw error;
}

export type MembershipFacts = {
  hasSession: boolean;
  hasProfile: boolean;
};

export async function fetchMembershipFacts(): Promise<MembershipFacts> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session === null) return { hasSession: false, hasProfile: false };

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error !== null) throw error;

  return { hasSession: true, hasProfile: data !== null };
}

export async function redeemInvite(
  inviteToken: string,
  displayName: string,
): Promise<RedeemOutcome> {
  const { data, error } = await supabase.rpc('redeem_invite', {
    invite_token: inviteToken,
    chosen_display_name: displayName,
  });

  if (error !== null) throw error;

  const [row] = data;
  if (row === undefined) throw new Error('redeem_invite returned no outcome');

  return row.outcome as RedeemOutcome;
}

/**
 * Ends the session and clears device-local private data.
 *
 * `scope: 'local'` is deliberate: signing out here should not invalidate the
 * person's other devices. The draft is discarded because it is private and the
 * next person to sign in on this device must not inherit it. The same call
 * covers account deletion, which has no local state of its own to forget.
 */
export async function signOut(): Promise<void> {
  clearDraft(deviceDraftStore);

  const { error } = await supabase.auth.signOut({ scope: 'local' });

  if (error !== null) throw error;
}

export function subscribeToAuthChanges(onChange: () => void): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => onChange());

  return () => subscription.unsubscribe();
}
