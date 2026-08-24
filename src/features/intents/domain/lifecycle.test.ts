import { describe, expect, it } from 'vitest';

import { canTransitionIntent, transitionIntent } from './lifecycle';

describe('intent lifecycle', () => {
  it('allows only documented transitions', () => {
    expect(canTransitionIntent('draft', 'live')).toBe(true);
    expect(canTransitionIntent('live', 'matched')).toBe(true);
    expect(canTransitionIntent('matched', 'resolved')).toBe(true);
    expect(canTransitionIntent('live', 'draft')).toBe(false);
    expect(canTransitionIntent('resolved', 'live')).toBe(false);
  });

  it('requires the restricted state to restore to a captured safe state', () => {
    expect(
      transitionIntent({ status: 'live', restrictedFrom: null }, 'restricted'),
    ).toEqual({ status: 'restricted', restrictedFrom: 'live' });
    expect(
      transitionIntent(
        { status: 'restricted', restrictedFrom: 'live' },
        'live',
      ),
    ).toEqual({ status: 'live', restrictedFrom: null });
  });

  it('rejects a stale or invalid transition', () => {
    expect(() =>
      transitionIntent({ status: 'resolved', restrictedFrom: null }, 'live'),
    ).toThrow('Invalid intent transition: resolved -> live');
    expect(() =>
      transitionIntent(
        { status: 'restricted', restrictedFrom: 'matched' },
        'live',
      ),
    ).toThrow('Invalid intent transition: restricted -> live');
  });
});
