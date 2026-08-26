import { describe, expect, it } from 'vitest';

import { findPrivacyViolations } from '@/design-system/privacy';

import {
  NOTIFICATION_EVENTS,
  buildPushPayload,
  shouldNotify,
  type NotificationJob,
  type NotificationPreferences,
} from './push-payload';

function job(overrides: Partial<NotificationJob> = {}): NotificationJob {
  return {
    eventType: 'response_received',
    objectType: 'response',
    objectId: '40000000-0000-0000-0000-000000000001',
    ...overrides,
  };
}

const allOn: NotificationPreferences = {
  notifyResponses: true,
  notifyDecisions: true,
  notifyMessages: true,
  notifyExpiry: true,
};

describe('push payload', () => {
  it('covers every event the database actually queues', () => {
    expect([...NOTIFICATION_EVENTS].sort()).toEqual(
      [
        'intent_material_edit',
        'message_received',
        'response_accepted',
        'response_declined',
        'response_received',
      ].sort(),
    );
  });

  it('builds a payload for each event, carrying only ids and generic copy', () => {
    for (const eventType of NOTIFICATION_EVENTS) {
      const payload = buildPushPayload(job({ eventType }));
      expect(payload).not.toBeNull();
      expect(payload!.title.length).toBeGreaterThan(0);
      expect(payload!.body.length).toBeGreaterThan(0);
      expect(Object.keys(payload!.data).sort()).toEqual([
        'eventType',
        'objectId',
        'objectType',
      ]);
    }
  });

  it('never invents a notification for an event it does not know', () => {
    expect(buildPushPayload(job({ eventType: 'something_new' }))).toBeNull();
  });

  it('carries no exact location or contact details in any copy', () => {
    for (const eventType of NOTIFICATION_EVENTS) {
      const payload = buildPushPayload(job({ eventType }))!;
      expect(findPrivacyViolations(`${payload.title} ${payload.body}`)).toEqual([]);
    }
  });

  it('keeps a decline neutral, with no private reasoning', () => {
    const payload = buildPushPayload(job({ eventType: 'response_declined' }))!;
    const copy = `${payload.title} ${payload.body}`.toLowerCase();
    for (const word of ['because', 'reason', 'unsuitable', 'rejected', 'not good']) {
      expect(copy).not.toContain(word);
    }
  });

  it('never promises or celebrates, and never nags', () => {
    for (const eventType of NOTIFICATION_EVENTS) {
      const payload = buildPushPayload(job({ eventType }))!;
      const copy = `${payload.title} ${payload.body}`.toLowerCase();
      for (const word of ['guarantee', 'congratulations', 'don’t miss', 'hurry', 'last chance']) {
        expect(copy).not.toContain(word);
      }
    }
  });
});

describe('preferences', () => {
  it('sends everything when every preference is on', () => {
    for (const eventType of NOTIFICATION_EVENTS) {
      expect(shouldNotify(job({ eventType }), allOn)).toBe(true);
    }
  });

  it('honours each preference against the events it governs', () => {
    expect(
      shouldNotify(job({ eventType: 'response_received' }), { ...allOn, notifyResponses: false }),
    ).toBe(false);
    expect(
      shouldNotify(job({ eventType: 'response_accepted' }), { ...allOn, notifyDecisions: false }),
    ).toBe(false);
    expect(
      shouldNotify(job({ eventType: 'response_declined' }), { ...allOn, notifyDecisions: false }),
    ).toBe(false);
    expect(
      shouldNotify(job({ eventType: 'message_received' }), { ...allOn, notifyMessages: false }),
    ).toBe(false);
  });

  it('does not silence one event by turning off an unrelated preference', () => {
    expect(
      shouldNotify(job({ eventType: 'message_received' }), { ...allOn, notifyResponses: false }),
    ).toBe(true);
  });

  it('stays silent about an event it does not recognise', () => {
    expect(shouldNotify(job({ eventType: 'something_new' }), allOn)).toBe(false);
  });
});
