import type { PublishRequest } from '@/features/intents/create/domain/publish-request';
import { supabase } from '@/infrastructure/supabase/client';

/**
 * Publishing. One server transaction creates the intent, its public context,
 * its private details, its reach and its event rows, and returns the share
 * slug. Nothing is written client-side, so a partial publish is not possible.
 */

export type PublishedIntent = {
  intentId: string;
  shareSlug: string;
  status: string;
  version: number;
};

export async function publishIntent(
  request: PublishRequest,
): Promise<PublishedIntent> {
  const { data, error } = await supabase.rpc('publish_intent', {
    intent_primitive: request.primitive,
    intent_statement: request.statement,
    intent_response_action: request.responseAction,
    intent_expires_at: request.expiresAt,
    reach: request.reach,
    context_starts_at: request.startsAt ?? undefined,
    context_deadline_at: request.deadlineAt ?? undefined,
    context_quantity: request.quantity ?? undefined,
    context_price_minor: request.priceMinor ?? undefined,
    context_currency: request.currency ?? undefined,
    context_approximate_place: request.approximatePlace ?? undefined,
    context_approximate_longitude: request.approximateLongitude ?? undefined,
    context_approximate_latitude: request.approximateLatitude ?? undefined,
    context_requirements: request.requirements,
    private_exact_address: request.exactAddress ?? undefined,
    private_contact: request.privateContact ?? undefined,
    private_coordination_notes: request.coordinationNotes ?? undefined,
    request_key: request.requestKey,
  });

  if (error !== null) throw error;

  const [row] = data;
  if (row === undefined) throw new Error('publish_intent returned no intent');

  return {
    intentId: row.intent_id,
    shareSlug: row.intent_share_slug,
    status: row.intent_status,
    version: row.intent_version,
  };
}
