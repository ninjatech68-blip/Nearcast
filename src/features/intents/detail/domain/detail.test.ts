import { describe, expect, it } from 'vitest';

import {
  describeClosure,
  describeMyResponse,
  listContextFacts,
  resolveResponseAvailability,
  type DeliveredIntent,
} from './detail';

const NOW = new Date('2026-08-31T10:00:00Z');

function intent(overrides: Partial<DeliveredIntent> = {}): DeliveredIntent {
  return {
    deliveryId: 'd1',
    intentId: 'i1',
    primitive: 'request',
    statement: 'Need two helpers to move a desk on Saturday morning',
    responseAction: 'Offer help',
    status: 'live',
    expiresAt: new Date('2026-09-01T10:00:00Z'),
    startsAt: null,
    deadlineAt: null,
    quantity: null,
    priceMinor: null,
    currency: null,
    requirements: [],
    approximatePlace: 'Indiranagar',
    distanceBand: 'walking_distance',
    broadcasterFirstName: 'Asha',
    confirmationCount: 0,
    viewerHasConfirmed: false,
    reasonCode: 'adjacent_trust_connection',
    reasonText: 'Someone you both know shared this',
    isSaved: false,
    isHidden: false,
    myResponseStatus: null,
    ...overrides,
  };
}

describe('resolveResponseAvailability', () => {
  it('offers the broadcaster’s own wording for the action', () => {
    const availability = resolveResponseAvailability(intent(), NOW);

    expect(availability).toEqual({ kind: 'open', label: 'Offer help' });
  });

  it('reports an existing response instead of offering a second one', () => {
    // The database holds one response per person per intent, so a second
    // attempt could only fail. Offering it would invite that failure.
    const availability = resolveResponseAvailability(
      intent({ myResponseStatus: 'pending' }),
      NOW,
    );

    expect(availability).toEqual({
      kind: 'responded',
      status: 'pending',
      label: 'You responded. Waiting for their decision.',
    });
  });

  it('still reports a withdrawn response rather than reopening the action', () => {
    const availability = resolveResponseAvailability(
      intent({ myResponseStatus: 'withdrawn' }),
      NOW,
    );

    expect(availability.kind).toBe('responded');
  });

  it('closes the action on a card you hid, because the server refuses one', () => {
    // `submit_response` treats a hidden delivery as ineligible. Offering the
    // action anyway would produce a failure the person could not explain.
    const availability = resolveResponseAvailability(intent({ isHidden: true }), NOW);

    expect(availability).toEqual({ kind: 'closed', label: 'You hid this' });
  });

  it('still reports your own response on a card you hid', () => {
    const availability = resolveResponseAvailability(
      intent({ isHidden: true, myResponseStatus: 'accepted' }),
      NOW,
    );

    expect(availability.kind).toBe('responded');
  });

  it('closes the action once the intent has expired by time alone', () => {
    const availability = resolveResponseAvailability(
      intent({ expiresAt: new Date('2026-08-31T09:00:00Z') }),
      NOW,
    );

    expect(availability).toEqual({ kind: 'closed', label: 'This expired' });
  });

  it('closes the action for a status that no longer takes responses', () => {
    const availability = resolveResponseAvailability(
      intent({ status: 'withdrawn' }),
      NOW,
    );

    expect(availability).toEqual({
      kind: 'closed',
      label: 'Withdrawn, no longer accepting responses',
    });
  });

  it('prefers reporting your own response over reporting the closure', () => {
    // Someone who was accepted needs to know that first; the lifecycle line
    // still says the intent is matched.
    const availability = resolveResponseAvailability(
      intent({ status: 'matched', myResponseStatus: 'accepted' }),
      NOW,
    );

    expect(availability.kind).toBe('responded');
  });
});

describe('describeMyResponse', () => {
  it('never invents a reason for a decision', () => {
    expect(describeMyResponse('declined')).toBe('They did not take this forward.');
  });

  it('reports acceptance as coordination being open', () => {
    expect(describeMyResponse('accepted')).toBe('Accepted. Coordination is open.');
  });
});

describe('describeClosure', () => {
  it('names time expiry rather than the stale live status', () => {
    expect(describeClosure('live')).toBe('This expired');
  });

  it('reuses the lifecycle wording for every other closed status', () => {
    expect(describeClosure('resolved')).toBe('Resolved');
  });
});

describe('listContextFacts', () => {
  it('lists only what the intent actually carries', () => {
    const facts = listContextFacts(intent());

    expect(facts).toEqual([
      { label: 'Area', detail: 'Indiranagar' },
      { label: 'Distance', detail: 'Walking distance' },
    ]);
  });

  it('omits an area the intent did not give rather than guessing one', () => {
    const facts = listContextFacts(intent({ approximatePlace: null }));

    expect(facts.some((fact) => fact.label === 'Area')).toBe(false);
  });

  it('formats a price from its minor units and currency', () => {
    const facts = listContextFacts(intent({ priceMinor: 15000, currency: 'INR' }));

    expect(facts).toContainEqual({ label: 'Price', detail: 'INR 150.00' });
  });

  it('states a quantity as the number asked for', () => {
    const facts = listContextFacts(intent({ quantity: 2 }));

    expect(facts).toContainEqual({ label: 'How many', detail: '2' });
  });

  it('lists each requirement separately so none is merged away', () => {
    const facts = listContextFacts(
      intent({ requirements: ['Bring your own racket', 'Intermediate level'] }),
    );

    expect(facts).toContainEqual({
      label: 'Requirement',
      detail: 'Bring your own racket',
    });
    expect(facts).toContainEqual({
      label: 'Requirement',
      detail: 'Intermediate level',
    });
  });

  it('reports an unknown distance as unknown rather than as nearby', () => {
    const facts = listContextFacts(intent({ distanceBand: 'unknown' }));

    expect(facts).toContainEqual({ label: 'Distance', detail: 'Distance unknown' });
  });
});
