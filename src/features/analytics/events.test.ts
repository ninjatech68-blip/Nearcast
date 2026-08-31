import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { EVENT_PROPERTIES, isKnownEvent, sanitiseEvent } from './events';

/**
 * MUST-102 requires the documented taxonomy, so the document is the
 * fixture. Reading it beats asserting a count somebody has to remember to
 * update: an event added to one side and not the other fails here, named.
 */
function documentedEvents(): string[] {
  const plan = readFileSync('docs/09 - Metrics and Analytics Plan.md', 'utf8');

  return [...plan.matchAll(/^\| `([a-z_]+)` \|/gm)].map((match) => match[1]);
}

describe('the taxonomy', () => {
  it('is exactly the documented event list', () => {
    expect(Object.keys(EVENT_PROPERTIES).sort()).toEqual(documentedEvents().sort());
  });

  it('allows exactly the properties each event documents', () => {
    const plan = readFileSync('docs/09 - Metrics and Analytics Plan.md', 'utf8');

    for (const [, name, props] of plan.matchAll(/^\| `([a-z_]+)` \| [^|]* \| ([^|]*) \|/gm)) {
      const documented = props
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part !== '');

      expect(EVENT_PROPERTIES[name as keyof typeof EVENT_PROPERTIES]).toEqual(documented);
    }
  });

  it('rejects an event that is not in it', () => {
    expect(isKnownEvent('intent_published')).toBe(true);
    expect(isKnownEvent('user_did_something')).toBe(false);
  });
});

describe('sanitiseEvent', () => {
  it('keeps the properties the taxonomy names', () => {
    const result = sanitiseEvent('intent_published', {
      intent_id: 'abc',
      primitive: 'request',
      expiry_hours: 24,
      area_bucket: 'indiranagar',
    });

    expect(result.rejected).toEqual([]);
    expect(result.properties).toEqual({
      intent_id: 'abc',
      primitive: 'request',
      expiry_hours: 24,
      area_bucket: 'indiranagar',
    });
  });

  /**
   * MUST-101, and the test Plan 05 Task 4 asks for by name. Each of these
   * is prohibited outright, and none of them is in any event's list, so the
   * allow-list is what stops them rather than a deny-list of key names.
   */
  it('drops every kind of prohibited data', () => {
    const result = sanitiseEvent('intent_published', {
      intent_id: 'abc',
      statement: 'Need two helpers to move a desk',
      message: 'see you at 6',
      latitude: 12.9784,
      longitude: 77.6408,
      address: '12 Some Exact Street',
      email: 'someone@example.com',
      phone: '+91 90000 00000',
      display_name: 'Asha Rao',
      group_name: 'Indiranagar Runners',
    });

    expect(result.properties).toEqual({ intent_id: 'abc' });
    expect(result.rejected.map((r) => r.property).sort()).toEqual([
      'address',
      'display_name',
      'email',
      'group_name',
      'latitude',
      'longitude',
      'message',
      'phone',
      'statement',
    ]);
  });

  /**
   * The allow-list is the point: a prohibited value cannot be smuggled in
   * by giving it an innocent-sounding name, because the name still has to
   * be one the taxonomy names for that event.
   */
  it('drops prohibited data renamed to look harmless', () => {
    const result = sanitiseEvent('intent_published', {
      where_exactly: '12.9784, 77.6408',
      note_body: 'Need two helpers',
      whom: 'Asha Rao',
    });

    expect(result.properties).toEqual({});
    expect(result.rejected).toHaveLength(3);
  });

  it('drops a property that belongs to a different event', () => {
    const result = sanitiseEvent('intent_shared', { intent_id: 'abc', match_id: 'm1' });

    expect(result.properties).toEqual({ intent_id: 'abc' });
  });

  it('drops a value too long to be a bucket or a code', () => {
    const result = sanitiseEvent('intent_published', {
      area_bucket: 'x'.repeat(65),
    });

    expect(result.properties).toEqual({});
    expect(result.rejected[0].reason).toMatch(/too long/);
  });

  it('keeps a value right at the limit', () => {
    const result = sanitiseEvent('intent_published', { area_bucket: 'x'.repeat(64) });

    expect(result.rejected).toEqual([]);
  });

  it('drops a nested object, which is where free text hides', () => {
    const result = sanitiseEvent('intent_published', {
      area_bucket: { name: 'indiranagar', latitude: 12.9 },
    });

    expect(result.properties).toEqual({});
  });

  it('drops a number that is not finite', () => {
    expect(sanitiseEvent('intent_published', { expiry_hours: NaN }).properties).toEqual({});
  });

  it('keeps false, which is a real answer and not a missing one', () => {
    const result = sanitiseEvent('intent_link_opened', {
      intent_id: 'a',
      authenticated: false,
    });

    expect(result.properties).toEqual({ intent_id: 'a', authenticated: false });
  });
});
