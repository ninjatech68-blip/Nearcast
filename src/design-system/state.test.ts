import { describe, expect, it } from 'vitest';

import { COMPONENT_STATE_PRIORITY, resolveComponentState } from './state';

describe('component state priority', () => {
  it('matches the order documented in DESIGN.md', () => {
    expect(COMPONENT_STATE_PRIORITY).toEqual([
      'disabled',
      'loading',
      'error',
      'offline',
      'pressed',
      'focused',
      'selected',
      'success',
    ]);
  });

  it('falls back to default when nothing is flagged', () => {
    expect(resolveComponentState({})).toBe('default');
  });

  it('returns the single flagged state', () => {
    expect(resolveComponentState({ selected: true })).toBe('selected');
    expect(resolveComponentState({ offline: true })).toBe('offline');
  });

  it('resolves every conflicting pair by documented precedence', () => {
    for (let higher = 0; higher < COMPONENT_STATE_PRIORITY.length; higher += 1) {
      for (let lower = higher + 1; lower < COMPONENT_STATE_PRIORITY.length; lower += 1) {
        const flags = {
          [COMPONENT_STATE_PRIORITY[higher]]: true,
          [COMPONENT_STATE_PRIORITY[lower]]: true,
        };

        expect(resolveComponentState(flags)).toBe(COMPONENT_STATE_PRIORITY[higher]);
      }
    }
  });

  it('ignores flags that are explicitly false', () => {
    expect(resolveComponentState({ disabled: false, selected: true })).toBe('selected');
  });

  it('keeps a disabled control disabled even while loading and erroring', () => {
    expect(resolveComponentState({ disabled: true, loading: true, error: true })).toBe('disabled');
  });
});
