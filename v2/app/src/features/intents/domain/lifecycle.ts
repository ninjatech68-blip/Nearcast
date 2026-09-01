export const INTENT_STATUSES = [
  'draft',
  'live',
  'matched',
  'resolved',
  'expired',
  'withdrawn',
  'restricted',
] as const;

export type IntentStatus = (typeof INTENT_STATUSES)[number];
export type SafeIntentStatus = Extract<IntentStatus, 'live' | 'matched'>;

export type IntentLifecycle = {
  status: IntentStatus;
  restrictedFrom: SafeIntentStatus | null;
};

const transitions: Record<IntentStatus, readonly IntentStatus[]> = {
  draft: ['live', 'withdrawn'],
  live: ['matched', 'resolved', 'expired', 'withdrawn', 'restricted'],
  matched: ['resolved', 'expired', 'withdrawn', 'restricted'],
  resolved: [],
  expired: [],
  withdrawn: [],
  restricted: ['live', 'matched', 'withdrawn'],
};

export function canTransitionIntent(
  from: IntentStatus,
  to: IntentStatus,
): boolean {
  return transitions[from].includes(to);
}

export function transitionIntent(
  lifecycle: IntentLifecycle,
  next: IntentStatus,
): IntentLifecycle {
  const restoringRestriction =
    lifecycle.status === 'restricted' &&
    (next === 'live' || next === 'matched');

  if (
    !canTransitionIntent(lifecycle.status, next) ||
    (restoringRestriction && lifecycle.restrictedFrom !== next)
  ) {
    throw new Error(
      `Invalid intent transition: ${lifecycle.status} -> ${next}`,
    );
  }

  if (next === 'restricted') {
    return {
      status: next,
      restrictedFrom: lifecycle.status as SafeIntentStatus,
    };
  }

  return { status: next, restrictedFrom: null };
}
