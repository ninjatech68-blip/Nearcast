import { describe, expect, it } from 'vitest';

import { deliveryFor, NEVER_USED, type DeliverableCast, type ViewerContext } from './delivery';

const viewer: ViewerContext = {
  areas: ['indiranagar', 'koramangala'],
  circleIds: ['badminton-gang'],
  adjacentCircleIds: ['kavya-friends'],
  recentTopics: ['badminton', 'ceramics'],
  activeWindows: ['weekday-evening'],
  blockedCasterIds: ['creep-1'],
};

const baseCast: DeliverableCast = {
  casterId: 'aarav',
  area: 'indiranagar',
  topics: ['badminton'],
  window: 'weekday-evening',
  reach: 'adjacent_network',
  casterCircleIds: ['kavya-friends'],
};

describe('delivery framework', () => {
  it('blocking always wins, whatever the trust distance', () => {
    const cast = { ...baseCast, casterId: 'creep-1', casterCircleIds: ['badminton-gang'] };
    expect(deliveryFor(viewer, cast)).toEqual({ deliver: false });
  });

  it('origin_only never leaves the shared circle', () => {
    const cast = { ...baseCast, reach: 'origin_only' as const };
    expect(deliveryFor(viewer, cast).deliver).toBe(false);

    const inCircle = { ...cast, casterCircleIds: ['badminton-gang'] };
    expect(deliveryFor(viewer, inCircle).deliver).toBe(true);
  });

  it('nearby_relevant needs place AND a shared thread for strangers, never place alone', () => {
    const stranger: DeliverableCast = {
      ...baseCast,
      reach: 'nearby_relevant',
      casterCircleIds: ['unknown-circle'],
      topics: ['chess'],
    };
    expect(deliveryFor(viewer, stranger).deliver).toBe(false);

    const sharedThread = { ...stranger, topics: ['badminton'] };
    expect(deliveryFor(viewer, sharedThread).deliver).toBe(true);
  });

  it('generates the reason from matched signals only', () => {
    const result = deliveryFor(viewer, baseCast);
    if (!result.deliver) throw new Error('expected delivery');
    expect(result.reason).toBe('one trusted link away · near you in indiranagar');
    // every part of the reason must be a signal that fired
    for (const part of result.reason.split(' · ')) {
      expect(result.signals).toContain(part);
    }
  });

  it('ranks a shared circle above everything else', () => {
    const circleCast = { ...baseCast, casterCircleIds: ['badminton-gang'] };
    const result = deliveryFor(viewer, circleCast);
    if (!result.deliver) throw new Error('expected delivery');
    expect(result.signals[0]).toBe('your circle vouches');
    expect(result.score).toBeGreaterThanOrEqual(6);
  });

  it('does not deliver when no signal fires, even if reach allows it', () => {
    const noSignal: DeliverableCast = {
      casterId: 'x',
      area: 'whitefield',
      topics: ['golf'],
      window: 'weekend-morning',
      reach: 'broader_approved',
      casterCircleIds: ['kavya-friends'],
    };
    // one-link fires here, so it delivers; strip that too:
    const trueStranger = { ...noSignal, casterCircleIds: ['nobody'] };
    expect(deliveryFor(viewer, trueStranger).deliver).toBe(false);
  });

  it('names what it never reads', () => {
    expect(NEVER_USED).toContain('your exact location');
    expect(NEVER_USED).toContain('your messages');
    expect(NEVER_USED).toContain('your contacts');
  });
});
