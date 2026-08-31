import {
  isKnownEvent,
  sanitiseEvent,
  type EventName,
  type PropertyValue,
} from '@/features/analytics/events';
import { getSupabase } from '@/infrastructure/supabase/client';

/**
 * Sending an event.
 *
 * Everything goes through `sanitiseEvent` first, so what reaches the
 * outbox is only what the taxonomy names for that event. That is not a
 * courtesy check that a caller may skip: this is the single write path, and
 * it drops anything else rather than trusting the call site to have got it
 * right.
 *
 * Failures are swallowed. Analytics must never be the reason a person
 * cannot publish a cast or send a message, and there is no button behind
 * these calls to report a failure to.
 *
 * Rows land in `analytics_outbox` rather than going straight to a vendor.
 * The outbox is a table the team can read and audit before anything leaves
 * the project, which is the only way a rule like "never send message text"
 * can be checked rather than asserted.
 */
export async function track(
  name: EventName,
  properties: Record<string, unknown> = {},
): Promise<void> {
  if (!isKnownEvent(name)) return;

  const client = getSupabase();
  if (!client) return;

  const { properties: safe, rejected } = sanitiseEvent(name, properties);

  if (rejected.length > 0 && __DEV__) {
    // Loud in development, silent in a release build: a dropped property is
    // a coding mistake to fix, not something to tell a person about.
    console.warn(
      `[nearcast] analytics dropped ${rejected.length} property/properties from ${name}:`,
      rejected.map((r) => `${r.property} (${r.reason})`).join(', '),
    );
  }

  try {
    const {
      data: { session },
    } = await client.auth.getSession();

    await client.from('analytics_outbox').insert({
      event_name: name,
      actor_id: session?.user.id ?? null,
      // The taxonomy puts the subject in properties; object_id mirrors the
      // one the funnel joins on so a query does not have to unpack JSON.
      object_id: idFrom(safe),
      properties: safe,
    });
  } catch {
    // See the note above.
  }
}

function idFrom(properties: Record<string, PropertyValue>): string | null {
  for (const key of ['intent_id', 'match_id', 'response_id'] as const) {
    const value = properties[key];
    if (typeof value === 'string') return value;
  }

  return null;
}
