/**
 * What a push notification is allowed to say.
 *
 * MUST-084 and the Doc 09 prohibitions: a payload carries object ids and
 * generic copy, never intent text, message bodies, contact details or exact
 * location. Everything specific is behind authentication, which the deep link
 * re-checks after routing.
 *
 * Pure on purpose. The worker that sends these can be verified separately; the
 * rule about what may leave the server is tested here.
 */

/** Exactly the events `private.queue_notification` is called with. */
export const NOTIFICATION_EVENTS = [
  'response_received',
  'response_accepted',
  'response_declined',
  'message_received',
  'intent_material_edit',
] as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export type NotificationJob = {
  eventType: string;
  objectType: string;
  objectId: string;
};

export type PushPayload = {
  title: string;
  body: string;
  data: { eventType: string; objectType: string; objectId: string };
};

export type NotificationPreferences = {
  notifyResponses: boolean;
  notifyDecisions: boolean;
  notifyMessages: boolean;
  notifyExpiry: boolean;
};

/**
 * Copy is deliberately flat. It says what happened and asks the person to
 * open the app; it does not quote anyone, celebrate, or press.
 */
const COPY: Record<NotificationEvent, { title: string; body: string }> = {
  response_received: {
    title: 'Someone responded',
    body: 'Open Nearcast to read the response.',
  },
  response_accepted: {
    title: 'Your response was accepted',
    body: 'You can start coordinating in Nearcast.',
  },
  response_declined: {
    title: 'Your response was not taken up',
    body: 'The broadcaster has decided. Nothing else is needed from you.',
  },
  message_received: {
    title: 'New message',
    body: 'Open Nearcast to read it.',
  },
  intent_material_edit: {
    title: 'An intent you responded to changed',
    body: 'Open Nearcast to see what changed.',
  },
};

/**
 * Which preference governs which event. A material edit is news about the
 * fate of something the person responded to, so it follows the decisions
 * preference; there is no separate column for it, and inventing one would be
 * a schema change no requirement asks for.
 */
const GOVERNED_BY: Record<NotificationEvent, keyof NotificationPreferences> = {
  response_received: 'notifyResponses',
  response_accepted: 'notifyDecisions',
  response_declined: 'notifyDecisions',
  message_received: 'notifyMessages',
  intent_material_edit: 'notifyDecisions',
};

function isKnownEvent(value: string): value is NotificationEvent {
  return (NOTIFICATION_EVENTS as readonly string[]).includes(value);
}

/**
 * The payload for a queued job, or null when the event is not one this build
 * knows. A newer server queuing an unfamiliar event must produce silence, not
 * an invented notification.
 */
export function buildPushPayload(job: NotificationJob): PushPayload | null {
  if (!isKnownEvent(job.eventType)) return null;

  const copy = COPY[job.eventType];
  return {
    title: copy.title,
    body: copy.body,
    data: {
      eventType: job.eventType,
      objectType: job.objectType,
      objectId: job.objectId,
    },
  };
}

/** Whether this device has asked to hear about this kind of event. */
export function shouldNotify(
  job: NotificationJob,
  preferences: NotificationPreferences,
): boolean {
  if (!isKnownEvent(job.eventType)) return false;
  return preferences[GOVERNED_BY[job.eventType]];
}
