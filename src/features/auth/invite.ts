import { getSupabase } from '@/infrastructure/supabase/client';

/**
 * Redeeming an invitation.
 *
 * Alpha is invite-only, and a profile is what membership means, so
 * `redeem_invite` is the only path that creates one — the client insert
 * policy on `profiles` is gone and publishing no longer enrols anyone.
 * That makes this the single door into the product.
 *
 * The server returns one generic outcome for missing, expired and
 * already-redeemed tokens so a caller cannot probe which invitations
 * exist, and this module keeps that property: there is one message for
 * all three, and it does not hint at which applied.
 */

export type InviteOutcome =
  | 'redeemed'
  | 'invalid_invite'
  | 'rate_limited'
  | 'invalid_input'
  | 'failed'
  | 'no_backend';

/**
 * An invitation travels by hand — a chat message, a read-aloud, a paste
 * from an email — so it arrives with whatever the carrier added. The
 * token is lowercase hex, so case and inner whitespace are noise rather
 * than signal and are removed before it reaches the server.
 */
export function normaliseInviteToken(raw: string): string {
  return raw.replace(/\s+/g, '').toLowerCase();
}

/** Nothing to say on success; the next screen is the message. */
export function describeInviteOutcome(outcome: InviteOutcome): string | null {
  switch (outcome) {
    case 'redeemed':
      return null;
    case 'invalid_invite':
      return 'That invitation cannot be used. It may already have been used, or it may have expired.';
    case 'rate_limited':
      return 'Too many tries. You can try again in an hour.';
    case 'invalid_input':
      return 'Add the name you want people to see, then try again.';
    case 'no_backend':
      return 'This build has no backend, so there is no invitation to check.';
    case 'failed':
      return 'We could not check that invitation. Check your connection and try again.';
  }
}

const OUTCOMES: readonly string[] = [
  'redeemed',
  'invalid_invite',
  'rate_limited',
  'invalid_input',
];

export async function redeemInvite(
  token: string,
  displayName: string,
): Promise<InviteOutcome> {
  const client = getSupabase();

  // No server means no membership. Reporting success here would grant
  // access the database never gave.
  if (!client) return 'no_backend';

  const { data, error } = await client.rpc('redeem_invite', {
    invite_token: normaliseInviteToken(token),
    chosen_display_name: displayName.trim(),
  });

  if (error) return 'failed';

  const row = Array.isArray(data) ? data[0] : undefined;
  const outcome = row?.outcome;

  // An unrecognised or absent answer is a failure, never a membership.
  return typeof outcome === 'string' && OUTCOMES.includes(outcome)
    ? (outcome as InviteOutcome)
    : 'failed';
}
