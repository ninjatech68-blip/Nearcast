import { describe, expect, it } from 'vitest';

import { deliveryFor, NEVER_USED, type DeliverableCast, type ViewerContext } from './delivery';

const viewer: ViewerContext = {
  areas: ['indiranagar', 'koramangala'],
  circleIds: ['badminton-gang'],
  adjacentCircleIds: ['kavya-friends'],
  interests: ['sports', 'arts'],
  activeWindows: ['weekday-evening'],
  blockedCasterIds: ['creep-1'],
};

const baseCast: DeliverableCast = {
  casterId: 'aarav',
  area: 'indiranagar',
  category: 'sports',
  categoryLabel: 'sports',
  window: 'weekday-evening',
  radiusKm: 5,
  casterCircleIds: ['kavya-friends'],
};

describe('delivery framework', () => {
  it('blocking always wins, whatever the trust distance', () => {
    const cast = { ...baseCast, casterId: 'creep-1', casterCircleIds: ['badminton-gang'] };
    expect(deliveryFor(viewer, cast)).toEqual({ deliver: false });
  });

  it('delivers a connected caster at any distance, radius or not', () => {
    // whitefield is ~15km from indiranagar; a 2km cast still reaches
    // you, because a friend's plan across town is still your friend's.
    const farFriend: DeliverableCast = {
      ...baseCast,
      area: 'whitefield',
      radiusKm: 2,
      casterCircleIds: ['badminton-gang'],
    };
    const result = deliveryFor(viewer, farFriend);
    expect(result.deliver).toBe(true);
    if (!result.deliver) return;
    // and the reason does NOT claim proximity that did not fire
    expect(result.signals).not.toContain('near you in whitefield');
  });

  it('needs place AND a shared thread for a stranger, never place alone', () => {
    const stranger: DeliverableCast = {
      ...baseCast,
      casterCircleIds: ['unknown-circle'],
      category: 'networking',
      categoryLabel: 'networking',
    };
    expect(deliveryFor(viewer, stranger).deliver).toBe(false);

    const sharedThread = { ...stranger, category: 'sports', categoryLabel: 'sports' };
    expect(deliveryFor(viewer, sharedThread).deliver).toBe(true);
  });

  it('does not deliver a stranger outside the radius, however good the match', () => {
    const farStranger: DeliverableCast = {
      ...baseCast,
      area: 'whitefield',
      radiusKm: 2,
      casterCircleIds: ['unknown-circle'],
    };
    expect(deliveryFor(viewer, farStranger).deliver).toBe(false);

    // widen the radius and the same cast now qualifies
    expect(deliveryFor(viewer, { ...farStranger, radiusKm: 25 }).deliver).toBe(true);
  });

  it('falls back to the default radius when the cast carries none', () => {
    const noRadius: DeliverableCast = { ...baseCast, casterCircleIds: ['unknown-circle'] };
    delete noRadius.radiusKm;
    expect(deliveryFor(viewer, noRadius).deliver).toBe(true);
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

  it('does not deliver when no signal fires', () => {
    const trueStranger: DeliverableCast = {
      casterId: 'x',
      area: 'whitefield',
      category: 'networking',
      categoryLabel: 'networking',
      window: 'weekend-morning',
      radiusKm: 25,
      casterCircleIds: ['nobody'],
    };
    expect(deliveryFor(viewer, trueStranger).deliver).toBe(false);
  });

  it('names what it never reads', () => {
    expect(NEVER_USED).toContain('your exact location');
    expect(NEVER_USED).toContain('your messages');
    expect(NEVER_USED).toContain('your contacts');
  });
});
