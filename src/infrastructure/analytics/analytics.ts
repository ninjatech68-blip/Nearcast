/**
 * Privacy-safe product analytics (Doc 09).
 *
 * Every event must appear in the taxonomy below with an explicit property
 * allowlist, and an invalid event is dropped whole — never stripped and sent —
 * so a mistake fails loud in development instead of leaking quietly in
 * production. The same prohibition the database enforces on analytics_outbox
 * is enforced here on the client path.
 *
 * Transport: buffered no-op until the PostHog project exists (human action
 * H-6). Swapping in the real transport is one call to setTransport; the
 * taxonomy and validation do not change.
 */

type EventProps = Record<string, string | number | boolean>;

/** Doc 09 event taxonomy, limited to events the app can emit today. */
const EVENT_ALLOWLIST: Record<string, readonly string[]> = {
  account_authenticated: ['method', 'is_new_user'],
  intent_draft_started: ['entry_point'],
  intent_previewed: ['primitive', 'reach_level'],
  intent_published: ['intent_id', 'primitive', 'reach_level', 'expiry_hours', 'area_bucket'],
  intent_shared: ['intent_id', 'channel'],
  intent_link_opened: ['intent_id', 'authenticated', 'referrer_class'],
  origin_confirmation_submitted: ['intent_id', 'confirmation_position_bucket'],
  intent_card_viewed: ['intent_id', 'explanation_code', 'position_bucket'],
  intent_detail_viewed: ['intent_id', 'source'],
  intent_feedback_submitted: ['intent_id', 'feedback_type'],
  response_started: ['intent_id', 'action_type'],
  response_submitted: ['intent_id', 'response_id', 'action_type', 'qualification_count'],
  response_decided: ['intent_id', 'response_id', 'decision', 'decision_latency_bucket'],
  match_created: ['intent_id', 'match_id', 'trust_distance_bucket'],
  coordination_message_sent: ['match_id', 'message_type'],
  intent_resolution_submitted: ['intent_id', 'resolution_type', 'lifetime_bucket'],
  interaction_completion_confirmed: ['intent_id', 'match_id', 'confirmed'],
  user_blocked: ['relationship_context', 'reason_group'],
  safety_report_submitted: ['object_type', 'reason_group', 'immediate_block'],
};

/**
 * Keys that may never appear in any payload (Doc 09 prohibited data). Checked
 * as substrings so `exact_latitude` or `user_email` are caught too.
 */
const PROHIBITED_KEY_FRAGMENTS = [
  'statement',
  'intent_text',
  'message',
  'body',
  'text',
  'email',
  'phone',
  'address',
  'latitude',
  'longitude',
  'coordinate',
  'geography',
  'display_name',
  'name',
  'group',
  'contact',
  'token',
  'password',
  'details',
] as const;

export function isProhibitedKey(key: string): boolean {
  const lowered = key.toLowerCase();
  return PROHIBITED_KEY_FRAGMENTS.some((fragment) => lowered.includes(fragment));
}

export type ValidationVerdict = { ok: true } | { ok: false; reason: string };

export function validateEvent(name: string, props: EventProps): ValidationVerdict {
  const allowed = EVENT_ALLOWLIST[name];
  if (!allowed) {
    return { ok: false, reason: `unknown event: ${name}` };
  }
  for (const key of Object.keys(props)) {
    if (isProhibitedKey(key)) {
      return { ok: false, reason: `prohibited property: ${key}` };
    }
    if (!allowed.includes(key)) {
      return { ok: false, reason: `property not in allowlist: ${key}` };
    }
  }
  return { ok: true };
}

export type AnalyticsEvent = { name: string; props: EventProps; occurredAt: string };
export type Transport = (event: AnalyticsEvent) => void;

let transport: Transport | null = null;
let buffer: AnalyticsEvent[] = [];

/**
 * Records one event. Call only after server success, never on optimistic UI
 * action. Never throws: analytics must not break a product flow.
 */
export function track(name: string, props: EventProps): void {
  try {
    const verdict = validateEvent(name, props);
    if (!verdict.ok) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(`[analytics] dropped event: ${verdict.reason}`);
      }
      return;
    }
    const event: AnalyticsEvent = { name, props, occurredAt: new Date().toISOString() };
    if (transport) {
      transport(event);
    } else {
      // Bounded so a long unsent session cannot grow memory without limit.
      buffer.push(event);
      if (buffer.length > 200) buffer.shift();
    }
  } catch {
    // Analytics failures are never allowed to surface to the user.
  }
}

export function setTransport(next: Transport): void {
  transport = next;
  for (const event of buffer.splice(0)) next(event);
}

// ------------------------------------------------------------------ test hooks
export function _setTransportForTests(next: Transport | null): void {
  transport = next;
}
export function _drainBufferForTests(): AnalyticsEvent[] {
  const drained = buffer;
  buffer = [];
  return drained;
}
