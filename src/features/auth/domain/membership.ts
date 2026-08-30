import { z } from 'zod';

/**
 * Closed-alpha membership.
 *
 * A Supabase session proves an identity, not membership. Alpha is invite-only,
 * and `redeem_invite` is the only path that creates a profile row, so the
 * presence of a profile is the membership test. `awaiting_invite` is the real
 * state between those two facts and has to be modelled, or a signed-in stranger
 * would look like a member.
 *
 * Pure: no React Native, no Supabase.
 */

export const MEMBERSHIP_STATES = [
  'loading',
  'signed_out',
  'awaiting_invite',
  'member',
] as const;

export type Membership = (typeof MEMBERSHIP_STATES)[number];

export function deriveMembership(input: {
  isResolved: boolean;
  hasSession: boolean;
  hasProfile: boolean;
}): Membership {
  if (!input.isResolved) return 'loading';
  if (!input.hasSession) return 'signed_out';

  return input.hasProfile ? 'member' : 'awaiting_invite';
}

/** Routes reachable without a redeemed invitation. */
const PUBLIC_SEGMENTS = new Set(['sign-in', 'invite']);

function isPublicRoute(segments: readonly string[]): boolean {
  const [first] = segments;

  return first !== undefined && PUBLIC_SEGMENTS.has(first);
}

/**
 * Where the current viewer belongs, or null to stay put. Kept pure so the
 * redirect rules can be tested without a navigator.
 */
export function resolveRedirect(
  membership: Membership,
  segments: readonly string[],
): string | null {
  if (membership === 'loading') return null;

  if (isPublicRoute(segments)) {
    return membership === 'member' ? '/' : null;
  }

  return membership === 'member' ? null : '/sign-in';
}

export const emailSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.email('Enter a valid email address'));

/** Supabase email OTP codes are six digits. */
export const otpCodeSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().regex(/^\d{6}$/, 'Enter the six-digit code'));

/** Mirrors the profiles.display_name database check. */
export const displayNameSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, 'Enter the name others will see')
      .max(60, 'Names are limited to 60 characters'),
  );

export const inviteTokenSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1, 'Enter your invitation code'));

export const REDEEM_OUTCOMES = [
  'redeemed',
  'invalid_invite',
  'rate_limited',
  'invalid_input',
] as const;

export type RedeemOutcome = (typeof REDEEM_OUTCOMES)[number];

/**
 * User-facing copy for a redemption result.
 *
 * Missing, expired and already-used invitations deliberately share one message.
 * The server returns a single `invalid_invite` outcome for all three, and
 * distinguishing them here would leak back exactly what the server refuses to
 * disclose: which invitations exist.
 */
export function describeRedeemOutcome(outcome: RedeemOutcome): string {
  switch (outcome) {
    case 'redeemed':
      return 'You are in.';
    case 'invalid_invite':
      return 'That invitation cannot be used. Check the code with whoever invited you.';
    case 'rate_limited':
      return 'Too many attempts. Wait an hour before trying again.';
    case 'invalid_input':
      return 'Check your invitation code and the name you entered.';
  }
}

/**
 * One message for every sign-in failure. Whether an email is registered is not
 * something a failed attempt should reveal.
 */
export const GENERIC_SIGN_IN_ERROR =
  'We could not complete that step. Check your details and try again.';
