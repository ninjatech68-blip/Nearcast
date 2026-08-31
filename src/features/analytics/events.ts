/**
 * The analytics taxonomy, as code.
 *
 * MUST-101 forbids intent text, response text, messages, exact
 * coordinates, addresses, contact details, display names and private-group
 * names from ever reaching analytics. A deny-list of key names is the weak
 * way to enforce that: it fails the moment somebody calls a field
 * `note_body` or `where_exactly`.
 *
 * So this is an allow-list instead, taken from the taxonomy in
 * `docs/09 - Metrics and Analytics Plan.md`. A property that is not named
 * for its event is dropped, which means prohibited data cannot arrive under
 * any name at all, invented or otherwise. MUST-102 asks for the taxonomy to
 * be used; making it the only way through is how that becomes true rather
 * than aspirational.
 *
 * Values are checked as well as keys, because `area_bucket` is a bucket and
 * an address would also fit in a string.
 *
 * Pure: no React Native, no Supabase.
 */

export const EVENT_PROPERTIES = {
  account_authenticated: ['method', 'is_new_user'],
  onboarding_completed: ['steps_completed', 'area_precision_band'],
  intent_draft_started: ['entry_point'],
  intent_details_confirmed: [
    'primitive',
    'has_area',
    'has_time',
    'has_price',
    'requirement_count',
  ],
  intent_previewed: ['primitive', 'reach_level'],
  intent_published: [
    'intent_id',
    'primitive',
    'reach_level',
    'expiry_hours',
    'area_bucket',
  ],
  intent_shared: ['intent_id', 'channel'],
  intent_link_opened: ['intent_id', 'authenticated', 'referrer_class'],
  origin_confirmation_submitted: ['intent_id', 'confirmation_position_bucket'],
  reach_change_previewed: ['intent_id', 'from_level', 'to_level'],
  reach_changed: ['intent_id', 'from_level', 'to_level', 'direction'],
  intent_card_viewed: ['intent_id', 'explanation_code', 'position_bucket'],
  intent_detail_viewed: ['intent_id', 'source'],
  recommendation_reason_viewed: ['intent_id', 'explanation_code'],
  intent_feedback_submitted: ['intent_id', 'feedback_type'],
  response_started: ['intent_id', 'action_type'],
  response_submitted: [
    'intent_id',
    'response_id',
    'action_type',
    'qualification_count',
  ],
  response_decided: [
    'intent_id',
    'response_id',
    'decision',
    'decision_latency_bucket',
  ],
  match_created: ['intent_id', 'match_id', 'trust_distance_bucket'],
  coordination_message_sent: ['match_id', 'message_type'],
  intent_resolution_submitted: ['intent_id', 'resolution_type', 'lifetime_bucket'],
  interaction_completion_confirmed: ['intent_id', 'match_id', 'confirmed'],
  user_blocked: ['relationship_context', 'reason_group'],
  safety_report_submitted: ['object_type', 'reason_group', 'immediate_block'],
  notification_opened: ['notification_type', 'object_type'],
} as const;

export type EventName = keyof typeof EVENT_PROPERTIES;

export type PropertyValue = string | number | boolean;

/**
 * A bucket, a code, an id or a flag. Nothing here is long, so a length cap
 * is a cheap second line: a statement, an address or a message would all
 * have to squeeze into 64 characters to pass, and none of them would still
 * be the thing it was.
 */
const MAX_VALUE_LENGTH = 64;

export type Rejection = { property: string; reason: string };

export type Sanitised = {
  properties: Record<string, PropertyValue>;
  rejected: Rejection[];
};

export function sanitiseEvent(
  name: EventName,
  properties: Record<string, unknown>,
): Sanitised {
  const allowed: readonly string[] = EVENT_PROPERTIES[name];
  const kept: Record<string, PropertyValue> = {};
  const rejected: Rejection[] = [];

  for (const [key, value] of Object.entries(properties)) {
    if (!allowed.includes(key)) {
      rejected.push({ property: key, reason: 'not in the taxonomy for this event' });
      continue;
    }

    if (typeof value === 'boolean' || typeof value === 'number') {
      if (typeof value === 'number' && !Number.isFinite(value)) {
        rejected.push({ property: key, reason: 'not a finite number' });
        continue;
      }
      kept[key] = value;
      continue;
    }

    if (typeof value !== 'string') {
      rejected.push({ property: key, reason: 'not a string, number or boolean' });
      continue;
    }

    if (value.length > MAX_VALUE_LENGTH) {
      rejected.push({ property: key, reason: 'too long to be a bucket or a code' });
      continue;
    }

    kept[key] = value;
  }

  return { properties: kept, rejected };
}

/** Whether an event can be sent at all. An unknown name is not in the taxonomy. */
export function isKnownEvent(name: string): name is EventName {
  return Object.prototype.hasOwnProperty.call(EVENT_PROPERTIES, name);
}
