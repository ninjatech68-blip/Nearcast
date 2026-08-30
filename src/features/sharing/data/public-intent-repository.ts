import {
  publicIntentSchema,
  type PublicIntent,
} from '@/features/sharing/domain/public-intent';
import { supabase } from '@/infrastructure/supabase/client';

/**
 * The public link's only data source.
 *
 * `get_public_intent` is the sole anonymous query per API Contracts, so nothing
 * here reads an intent table directly. The response is parsed through the strict
 * schema, which drops anything the projection should not have carried.
 */

export async function fetchPublicIntent(
  shareSlug: string,
): Promise<PublicIntent | null> {
  const { data, error } = await supabase
    .rpc('get_public_intent', { requested_share_slug: shareSlug })
    .maybeSingle();

  if (error !== null) throw error;
  if (data === null) return null;

  return publicIntentSchema.parse({
    id: data.id,
    shareSlug: data.share_slug,
    primitive: data.primitive,
    statement: data.statement,
    responseAction: data.response_action,
    expiresAt: data.expires_at,
    publishedAt: data.published_at,
    startsAt: data.starts_at,
    deadlineAt: data.deadline_at,
    quantity: data.quantity,
    priceMinor: data.price_minor,
    currency: data.currency,
    approximatePlace: data.approximate_place,
    broadcasterFirstName: data.broadcaster_first_name,
    confirmationCount: Number(data.confirmation_count),
  });
}

/** Whether the signed-in viewer has already confirmed. */
export async function fetchViewerHasConfirmed(intentId: string): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session === null) return false;

  // RLS narrows this to the viewer's own row, so it can never enumerate the
  // confirming circle.
  const { data, error } = await supabase
    .from('intent_confirmations')
    .select('intent_id')
    .eq('intent_id', intentId)
    .maybeSingle();

  if (error !== null) throw error;

  return data !== null;
}

export async function confirmIntent(
  shareSlug: string,
): Promise<{ confirmationCount: number; viewerHasConfirmed: boolean }> {
  const { data, error } = await supabase.rpc('confirm_intent', {
    requested_share_slug: shareSlug,
  });

  if (error !== null) throw error;

  const [row] = data;
  if (row === undefined) throw new Error('confirm_intent returned no result');

  return {
    confirmationCount: Number(row.confirmation_count),
    viewerHasConfirmed: row.viewer_has_confirmed,
  };
}
