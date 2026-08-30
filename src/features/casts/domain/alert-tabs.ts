/**
 * Which alert groups are on screen, and which one you are looking at.
 *
 * Alerts shows three groups — what needs a decision from you, what is
 * only news, and the plans you are part of — and a group with no rows
 * is not rendered at all. That removes the thing tabs are usually
 * punished for, which is a door you have to open to find out it was
 * empty. It introduces a different risk: a control whose membership
 * changes is a moving target, and muscle memory is built on position.
 *
 * These are the rules that keep it from becoming one. They are pure so
 * the screen cannot quietly diverge from them.
 *
 *   1. The order is fixed, always. A group appears and disappears at
 *      its own position; the others never swap places to fill a gap.
 *   2. Below two populated groups there is no strip. One group is a
 *      section header, not a tab — a lone tab is a control with no
 *      alternative. Zero groups is the empty state.
 *   3. Selection falls FORWARD. If the group you are on empties while
 *      you are reading it, you land on the first group that still has
 *      rows, never on a blank pane and never silently on the last one.
 *
 * Rule 4 — a real count in every tab label — belongs to the view, but
 * the counts it renders are the same ones passed in here.
 */

export type AlertTabId = 'needs' | 'waiting' | 'plans';

/** the one order, and the only place it is written down. */
export const ALERT_TAB_ORDER: readonly AlertTabId[] = ['needs', 'waiting', 'plans'];

export type AlertCounts = Readonly<Record<AlertTabId, number>>;

export type AlertTabState = {
  /** populated groups, always in ALERT_TAB_ORDER. */
  readonly visible: readonly AlertTabId[];
  /** the group to render, or null when there is nothing at all. */
  readonly shown: AlertTabId | null;
  /** render the tab strip? false below two populated groups. */
  readonly showStrip: boolean;
};

export function alertTabs(counts: AlertCounts, selected: AlertTabId): AlertTabState {
  const visible = ALERT_TAB_ORDER.filter((id) => counts[id] > 0);
  return {
    visible,
    // "falls forward" is exactly this: the first still-populated group
    // in the fixed order, which is why the filter above must not sort.
    shown: visible.includes(selected) ? selected : (visible[0] ?? null),
    showStrip: visible.length >= 2,
  };
}
