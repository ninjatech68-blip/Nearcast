/**
 * The component state contract from DESIGN.md.
 *
 * Every interactive primitive resolves its visual state through this module so
 * that a control cannot, for example, render as pressed while it is disabled.
 */
export const COMPONENT_STATE_PRIORITY = [
  'disabled',
  'loading',
  'error',
  'offline',
  'pressed',
  'focused',
  'selected',
  'success',
] as const;

export type PrioritisedState = (typeof COMPONENT_STATE_PRIORITY)[number];

export type ComponentState = PrioritisedState | 'default';

export type ComponentStateFlags = Partial<Record<PrioritisedState, boolean>>;

/** Resolve the single visual state a component should render, highest priority first. */
export function resolveComponentState(flags: ComponentStateFlags): ComponentState {
  return COMPONENT_STATE_PRIORITY.find((state) => flags[state] === true) ?? 'default';
}

/** A control is not operable while it is disabled or working. */
export function isInteractionBlocked(state: ComponentState): boolean {
  return state === 'disabled' || state === 'loading';
}
