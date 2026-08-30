/**
 * Why an intent reached you.
 *
 * Every delivery stores an explanation code and a rendered sentence, so the
 * answer a person reads is the one that was recorded when the intent reached
 * them, not one reconstructed later from rules that may since have changed.
 *
 * The client renders the stored sentence rather than deriving its own from the
 * code. Deriving it here would let the app and the database disagree, and the
 * database is the one that made the delivery decision.
 *
 * Pure: no React Native, no Supabase.
 */

export const DELIVERY_REASON_CODES = [
  'origin_recipient',
  'adjacent_trust_connection',
  'nearby_interest_match',
  'broader_approved_match',
] as const;

export type DeliveryReasonCode = (typeof DELIVERY_REASON_CODES)[number];

export function isApprovedReasonCode(value: string): value is DeliveryReasonCode {
  return (DELIVERY_REASON_CODES as readonly string[]).includes(value);
}

/**
 * A card with no valid explanation is not shown.
 *
 * The Exit Gate requires every feed card to carry a valid explanation. Dropping
 * such a row is the honest failure: inventing a reason would be fabricating the
 * provenance the whole feature exists to guarantee.
 */
export function hasUsableExplanation(card: {
  reasonCode: string;
  reasonText: string;
}): boolean {
  return isApprovedReasonCode(card.reasonCode) && card.reasonText.trim().length > 0;
}

export const FEEDBACK_ACTIONS = ['hide', 'save', 'not_relevant'] as const;

export type FeedbackAction = (typeof FEEDBACK_ACTIONS)[number];

export const FEEDBACK_LABELS: Record<FeedbackAction, string> = {
  hide: 'Hide',
  save: 'Save',
  not_relevant: 'Not relevant',
};
