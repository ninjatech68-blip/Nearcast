import {
  describeDistanceBand,
  type DistanceBand,
} from '@/features/location/domain/distance-band';
import type { DeliveryReasonCode } from '@/features/feed/domain/delivery-reason';
import type { IntentPrimitive } from '@/features/intents/domain/intent';
import type { IntentStatus } from '@/features/intents/domain/lifecycle';
// `acceptsResponses` mirrors the response insert policy and `describeStatus` is
// the one lifecycle wording. Both live under the owner feature because that is
// where they were first needed, but neither is owner-specific, and a second copy
// here would be free to drift from the policy the database actually enforces.
import {
  acceptsResponses,
  describeStatus,
} from '@/features/intents/manage/domain/owner-actions';
import type { ResponseStatus } from '@/features/responses/inbox/domain/status';

/**
 * The intent detail screen's rules.
 *
 * This is the screen a feed card opens, so it must say the same things the card
 * said and add only what the server sent with it. It holds no coordinate, no
 * exact address and no contact: those are not in the record it is given, which
 * is the point — a screen cannot leak a field it never receives.
 *
 * Pure: no React Native, no Supabase.
 */

export type DeliveredIntent = {
  deliveryId: string;
  intentId: string;
  primitive: IntentPrimitive;
  statement: string;
  responseAction: string;
  status: IntentStatus;
  expiresAt: Date;
  startsAt: Date | null;
  deadlineAt: Date | null;
  quantity: number | null;
  priceMinor: number | null;
  currency: string | null;
  requirements: string[];
  approximatePlace: string | null;
  distanceBand: DistanceBand;
  broadcasterFirstName: string | null;
  confirmationCount: number;
  viewerHasConfirmed: boolean;
  reasonCode: DeliveryReasonCode;
  reasonText: string;
  isSaved: boolean;
  isHidden: boolean;
  myResponseStatus: ResponseStatus | null;
};

export type ResponseAvailability =
  | { kind: 'open'; label: string }
  | { kind: 'responded'; status: ResponseStatus; label: string }
  | { kind: 'closed'; label: string };

/**
 * What the single call to action is, or why there isn't one.
 *
 * An existing response outranks a closure. Someone who was accepted needs to
 * read that before anything else, and someone whose reply is still pending on a
 * closed intent is better told they replied than told the intent shut. The
 * lifecycle line is rendered separately, so the closure is never hidden.
 *
 * The order also keeps the screen honest about what the database permits: one
 * response exists per person per intent, so offering the action again could only
 * produce a failure.
 */
export function resolveResponseAvailability(
  intent: DeliveredIntent,
  now: Date,
): ResponseAvailability {
  if (intent.myResponseStatus !== null) {
    return {
      kind: 'responded',
      status: intent.myResponseStatus,
      label: describeMyResponse(intent.myResponseStatus),
    };
  }

  // A hidden delivery is ineligible to `submit_response`, so the action has to
  // go. It is checked before the lifecycle because it is the more specific
  // answer: the intent may be perfectly live, and this person hid it.
  if (intent.isHidden) {
    return { kind: 'closed', label: 'You hid this' };
  }

  if (!acceptsResponses(intent.status, intent.expiresAt, now)) {
    return { kind: 'closed', label: describeClosure(intent.status) };
  }

  return { kind: 'open', label: intent.responseAction };
}

/**
 * Your own response, in the respondent's terms.
 *
 * The inbox copy is written for the broadcaster who made the decision; this is
 * for the person it was made about. A declined response reports the decision
 * and never a reason, because no reason was recorded and inventing one would be
 * worse than the silence.
 */
export function describeMyResponse(status: ResponseStatus): string {
  switch (status) {
    case 'pending':
      return 'You responded. Waiting for their decision.';
    case 'accepted':
      return 'Accepted. Coordination is open.';
    case 'declined':
      return 'They did not take this forward.';
    case 'withdrawn':
      return 'You withdrew your response.';
  }
}

/**
 * Why the action is closed.
 *
 * A `live` intent whose expiry has passed is the one case the lifecycle wording
 * gets wrong: the row still says live because expiry is swept by a job rather
 * than at the moment it lapses. Saying "live and accepting responses" to
 * someone who cannot respond would be the screen contradicting itself.
 */
export function describeClosure(status: IntentStatus): string {
  return status === 'live' ? 'This expired' : describeStatus(status);
}

export type ContextFact = { label: string; detail: string };

/**
 * The context the intent actually carries.
 *
 * Absent fields are omitted rather than rendered as "not specified": a list of
 * blanks reads as though the broadcaster withheld something. Requirements stay
 * one row each so a long list is never summarised into a count.
 */
export function listContextFacts(intent: DeliveredIntent): ContextFact[] {
  const facts: ContextFact[] = [];

  if (intent.startsAt !== null) {
    facts.push({ label: 'Starts', detail: formatMoment(intent.startsAt) });
  }

  if (intent.deadlineAt !== null) {
    facts.push({ label: 'By', detail: formatMoment(intent.deadlineAt) });
  }

  if (intent.approximatePlace !== null) {
    facts.push({ label: 'Area', detail: intent.approximatePlace });
  }

  facts.push({
    label: 'Distance',
    detail: describeDistanceBand(intent.distanceBand),
  });

  if (intent.quantity !== null) {
    facts.push({ label: 'How many', detail: String(intent.quantity) });
  }

  const price = formatPrice(intent.priceMinor, intent.currency);
  if (price !== null) {
    facts.push({ label: 'Price', detail: price });
  }

  for (const requirement of intent.requirements) {
    facts.push({ label: 'Requirement', detail: requirement });
  }

  return facts;
}

/**
 * Minor units to a readable amount.
 *
 * The database stores minor units and requires the currency alongside them, so
 * a price without a currency is not a price and is dropped rather than shown
 * with a guessed symbol.
 */
export function formatPrice(
  priceMinor: number | null,
  currency: string | null,
): string | null {
  if (priceMinor === null || currency === null) return null;

  return `${currency} ${(priceMinor / 100).toFixed(2)}`;
}

function formatMoment(moment: Date): string {
  return moment.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
