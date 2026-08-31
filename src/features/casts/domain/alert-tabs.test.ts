import { describe, expect, it } from 'vitest';

import { ALERT_TAB_ORDER, alertTabs, type AlertCounts } from './alert-tabs';

const none: AlertCounts = { needs: 0, waiting: 0, plans: 0 };

describe('alertTabs', () => {
  it('shows only the groups that have rows', () => {
    expect(alertTabs({ ...none, needs: 2, plans: 3 }, 'needs').visible).toEqual(['needs', 'plans']);
  });

  it('never reorders: a tab appears at its own position, others do not move', () => {
    // waiting arriving must slot BETWEEN needs and plans, not on the end.
    expect(alertTabs({ needs: 1, waiting: 0, plans: 1 }, 'needs').visible).toEqual(['needs', 'plans']);
    expect(alertTabs({ needs: 1, waiting: 4, plans: 1 }, 'needs').visible).toEqual(['needs', 'waiting', 'plans']);
    expect(alertTabs({ needs: 0, waiting: 4, plans: 1 }, 'waiting').visible).toEqual(['waiting', 'plans']);
  });

  it('hides the strip below two populated groups', () => {
    expect(alertTabs({ ...none, waiting: 5 }, 'waiting').showStrip).toBe(false);
    expect(alertTabs({ ...none, waiting: 5, plans: 1 }, 'waiting').showStrip).toBe(true);
  });

  it('shows nothing at all when every group is empty', () => {
    const state = alertTabs(none, 'needs');
    expect(state.shown).toBeNull();
    expect(state.showStrip).toBe(false);
    expect(state.visible).toEqual([]);
  });

  it('falls forward when the selected tab empties under you', () => {
    // answering the last request while sitting on "needs you"
    expect(alertTabs({ needs: 0, waiting: 2, plans: 1 }, 'needs').shown).toBe('waiting');
    // and forward means the FIRST tab still holding rows, never the last
    expect(alertTabs({ needs: 0, waiting: 0, plans: 1 }, 'needs').shown).toBe('plans');
  });

  it('keeps the selected tab while it still holds rows', () => {
    expect(alertTabs({ needs: 2, waiting: 2, plans: 2 }, 'plans').shown).toBe('plans');
  });

  it('declares one fixed order for the whole app', () => {
    expect(ALERT_TAB_ORDER).toEqual(['needs', 'waiting', 'plans']);
  });
});
