import { getSupabase } from '@/infrastructure/supabase/client';
import { shareLinkFor, type ShareLink } from '@/features/sharing/share-link';

/**
 * The share link's data, from the two server calls that own it.
 *
 * `get_public_intent` is the only anonymous read in the product: it is
 * granted to `anon` so a link recipient can see the cast before installing
 * anything, which MUST-022 requires. It projects no coordinate, no address,
 * no contact and no confirmer identity, so there is nothing here to leak.
 *
 * `confirm_intent` is the write, and it is a function because the client
 * can no longer count confirmations for itself: reading other people's
 * confirmation rows is exactly the origin-circle membership MUST-023
 * protects, so the count comes back from the definer instead.
 */

export type PublicCast = {
  id: string;
  shareSlug: string;
  category: string;
  statement: string;
  area: string | null;
  startsAt: string | null;
  expiresAt: string;
  casterFirstName: string | null;
  confirmationCount: number;
  seatsTaken: number;
  slotsWanted: number | null;
};

export async function fetchPublicCast(shareSlug: string): Promise<PublicCast | null> {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .rpc('get_public_intent', { requested_share_slug: shareSlug })
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    shareSlug: data.share_slug,
    category: data.category,
    statement: data.statement,
    area: data.approximate_place,
    startsAt: data.starts_at,
    expiresAt: data.expires_at,
    casterFirstName: data.broadcaster_first_name,
    confirmationCount: Number(data.confirmation_count ?? 0),
    seatsTaken: Number(data.seats_taken ?? 0),
    slotsWanted: data.slots_wanted,
  };
}

export type ConfirmResult =
  | { kind: 'confirmed'; count: number }
  | { kind: 'not_a_member' }
  | { kind: 'failed' };

export async function confirmPublicCast(shareSlug: string): Promise<ConfirmResult> {
  const client = getSupabase();
  if (!client) return { kind: 'failed' };

  const { data, error } = await client.rpc('confirm_intent', {
    requested_share_slug: shareSlug,
  });

  if (error) {
    // The server distinguishes "you never redeemed an invitation" from any
    // other failure, and the screen says different things for each.
    return error.message.includes('not_a_member')
      ? { kind: 'not_a_member' }
      : { kind: 'failed' };
  }

  const row = Array.isArray(data) ? data[0] : undefined;

  return row
    ? { kind: 'confirmed', count: Number(row.confirmation_count ?? 0) }
    : { kind: 'failed' };
}

export async function hasViewerConfirmed(shareSlug: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  const { data, error } = await client.rpc('viewer_has_confirmed', {
    requested_share_slug: shareSlug,
  });

  return error ? false : data === true;
}

/**
 * Where a share link points.
 *
 * `EXPO_PUBLIC_SHARE_ORIGIN` is read here rather than in the pure module so
 * that module stays testable without the environment. Unset means no
 * domain yet, and `shareLinkFor` falls back to the app scheme.
 */
export function shareLinkForSlug(shareSlug: string): ShareLink {
  return shareLinkFor(shareSlug, process.env.EXPO_PUBLIC_SHARE_ORIGIN ?? '');
}
