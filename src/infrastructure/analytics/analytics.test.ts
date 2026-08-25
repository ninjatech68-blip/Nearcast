import { beforeEach, describe, expect, it } from 'vitest';

import {
  isProhibitedKey,
  track,
  validateEvent,
  _drainBufferForTests,
  _setTransportForTests,
} from './analytics';

describe('analytics allowlist', () => {
  beforeEach(() => {
    _setTransportForTests(null);
    _drainBufferForTests();
  });

  it('accepts a documented event with only allowed properties', () => {
    const verdict = validateEvent('intent_published', {
      intent_id: 'abc',
      primitive: 'request',
      reach_level: 'adjacent_network',
      expiry_hours: 48,
    });
    expect(verdict.ok).toBe(true);
  });

  it('rejects an event name that is not in the taxonomy', () => {
    const verdict = validateEvent('user_scrolled_feed', {});
    expect(verdict.ok).toBe(false);
  });

  it('rejects a property outside the event allowlist even when harmless-looking', () => {
    const verdict = validateEvent('intent_published', {
      intent_id: 'abc',
      primitive: 'request',
      reach_level: 'origin_only',
      expiry_hours: 48,
      position: 2,
    });
    expect(verdict.ok).toBe(false);
  });

  it('rejects prohibited content keys regardless of the event', () => {
    for (const key of [
      'statement',
      'intent_text',
      'message',
      'body',
      'email',
      'phone',
      'address',
      'latitude',
      'longitude',
      'display_name',
      'private_group_name',
      'access_token',
      'contact_details',
    ]) {
      expect(isProhibitedKey(key)).toBe(true);
    }
    expect(isProhibitedKey('intent_id')).toBe(false);
    expect(isProhibitedKey('reach_level')).toBe(false);
  });

  it('drops an invalid event instead of sending a stripped version', () => {
    track('intent_published', {
      intent_id: 'abc',
      primitive: 'request',
      reach_level: 'origin_only',
      expiry_hours: 48,
      statement: 'Need one person for badminton tonight',
    });
    expect(_drainBufferForTests()).toHaveLength(0);
  });

  it('buffers a valid event for the transport', () => {
    track('response_decided', {
      intent_id: 'abc',
      response_id: 'def',
      decision: 'accept',
    });
    const buffered = _drainBufferForTests();
    expect(buffered).toHaveLength(1);
    expect(buffered[0]?.name).toBe('response_decided');
  });

  it('never throws from track, even on garbage input', () => {
    expect(() => track('intent_published', { statement: 'leak' })).not.toThrow();
    expect(() => track('nonsense', { anything: 1 })).not.toThrow();
  });
});
