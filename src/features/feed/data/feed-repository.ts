import {
  hasUsableExplanation,
  type DeliveryReasonCode,
} from '@/features/feed/domain/delivery-reason';
import {
  parseDistanceBand,
  type DistanceBand,
} from '@/features/location/domain/distance-band';
import { supabase } from '@/infrastructure/supabase/client';

/**
 * The Home feed.
 *
 * Ordering and eligibility are the server's. This layer parses, drops any card
 * without a usable explanation, and offers the three feedback actions. It does
 * not re-rank: a feed the client reorders is one the server can no longer
 * explain.
 */

export type FeedCard = {
  deliveryId: string;
  intentId: string;
  statement: string;
  responseAction: string;
  approximatePlace: string | null;
  distanceBand: DistanceBand;
  broadcasterFirstName: string | null;
  reasonCode: DeliveryReasonCode;
  reasonText: string;
  isSaved: boolean;
};

export async function fetchHomeFeed(pageSize = 20): Promise<FeedCard[]> {
  const { data, error } = await supabase.rpc('home_feed', { page_size: pageSize });

  if (error !== null) throw error;

  return data
    .map((row) => ({
      deliveryId: row.delivery_id,
      intentId: row.intent_id,
      statement: row.statement,
      responseAction: row.response_action,
      approximatePlace: row.approximate_place,
      distanceBand: parseDistanceBand(row.distance_band ?? ''),
      broadcasterFirstName: row.broadcaster_first_name,
      reasonCode: row.reason_code as DeliveryReasonCode,
      reasonText: row.reason_text ?? '',
      isSaved: row.is_saved,
    }))
    // The Exit Gate requires every card to carry a valid explanation. A row
    // without one is dropped rather than shown with an invented reason.
    .filter(hasUsableExplanation);
}

export async function hideDelivery(deliveryId: string): Promise<void> {
  const { error } = await supabase
    .from('intent_deliveries')
    .update({ hidden_at: new Date().toISOString() })
    .eq('id', deliveryId);

  if (error !== null) throw error;
}

export async function markNotRelevant(deliveryId: string): Promise<void> {
  const { error } = await supabase
    .from('intent_deliveries')
    .update({ feedback: 'not_relevant' })
    .eq('id', deliveryId);

  if (error !== null) throw error;
}

export async function setSaved(deliveryId: string, saved: boolean): Promise<void> {
  const { error } = await supabase
    .from('intent_deliveries')
    .update({ saved_at: saved ? new Date().toISOString() : null })
    .eq('id', deliveryId);

  if (error !== null) throw error;
}
