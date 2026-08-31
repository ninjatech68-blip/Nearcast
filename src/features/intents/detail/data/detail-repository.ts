import { isApprovedReasonCode } from '@/features/feed/domain/delivery-reason';
import type { DeliveredIntent } from '@/features/intents/detail/domain/detail';
import { INTENT_PRIMITIVES } from '@/features/intents/domain/intent';
import { INTENT_STATUSES } from '@/features/intents/domain/lifecycle';
import { RESPONSE_STATUSES } from '@/features/responses/inbox/domain/status';
import { parseDistanceBand } from '@/features/location/domain/distance-band';
import { supabase } from '@/infrastructure/supabase/client';

/**
 * The detail screen's only data source.
 *
 * `delivered_intent` is the whole authorisation: it returns a row only to
 * someone the intent was genuinely delivered to, so a guessed or stale id in a
 * deep link produces `null` here and "not available" on screen rather than
 * content. Nothing in this file reads an intent table directly.
 */

/** A row came back but could not be trusted; the screen shows nothing. */
export class UnreadableIntentError extends Error {}

export async function fetchDeliveredIntent(
  intentId: string,
): Promise<DeliveredIntent | null> {
  const { data, error } = await supabase
    .rpc('delivered_intent', { target_intent: intentId })
    .maybeSingle();

  if (error !== null) throw error;
  if (data === null) return null;

  // The Exit Gate requires a valid stored explanation for anything delivered.
  // A row without one is refused rather than shown with an invented reason.
  if (!isApprovedReasonCode(data.reason_code) || data.reason_text.trim() === '') {
    throw new UnreadableIntentError('delivery carried no usable explanation');
  }

  if (
    !(INTENT_PRIMITIVES as readonly string[]).includes(data.primitive) ||
    !(INTENT_STATUSES as readonly string[]).includes(data.status)
  ) {
    throw new UnreadableIntentError('delivery carried an unknown primitive or status');
  }

  return {
    deliveryId: data.delivery_id,
    intentId: data.intent_id,
    primitive: data.primitive,
    statement: data.statement,
    responseAction: data.response_action,
    status: data.status,
    expiresAt: new Date(data.expires_at),
    startsAt: parseMoment(data.starts_at),
    deadlineAt: parseMoment(data.deadline_at),
    quantity: data.quantity,
    priceMinor: data.price_minor === null ? null : Number(data.price_minor),
    currency: data.currency,
    requirements: parseRequirements(data.requirements),
    approximatePlace: data.approximate_place,
    distanceBand: parseDistanceBand(data.distance_band ?? ''),
    broadcasterFirstName: data.broadcaster_first_name,
    confirmationCount: Number(data.confirmation_count),
    viewerHasConfirmed: data.viewer_has_confirmed,
    reasonCode: data.reason_code,
    reasonText: data.reason_text,
    isSaved: data.is_saved,
    isHidden: data.is_hidden,
    myResponseStatus: parseResponseStatus(data.my_response_status),
  };
}

function parseMoment(value: string | null): Date | null {
  if (value === null) return null;

  const moment = new Date(value);

  return Number.isNaN(moment.getTime()) ? null : moment;
}

/**
 * Requirements are stored as JSON, so the column's type is wider than the shape
 * the app wrote. Anything that is not a non-empty string is dropped rather than
 * rendered as an empty bullet.
 */
function parseRequirements(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim() !== '',
  );
}

/** An unrecognised status is treated as no response, never as an accepted one. */
function parseResponseStatus(value: unknown): DeliveredIntent['myResponseStatus'] {
  return typeof value === 'string' &&
    (RESPONSE_STATUSES as readonly string[]).includes(value)
    ? (value as DeliveredIntent['myResponseStatus'])
    : null;
}
