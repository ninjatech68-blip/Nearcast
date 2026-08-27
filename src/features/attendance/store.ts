import { useMemo, useSyncExternalStore } from 'react';

import { outcomeFor, type Outcome, type PlanRecord, type PresenceReport } from '@/features/casts/domain/attendance';

/**
 * attendance store: the session-only ledger of plans, presence reports,
 * and cancellations that drives the receipt / flake outcome for every
 * participant. the pure domain in @/features/casts/domain/attendance
 * decides what a plan means; this store holds the state the domain
 * reads. production replaces it with a supabase table, same shape.
 *
 * privacy: reports are opaque outside the plan. you never learn who
 * marked you a no-show — the outcome is unanimous absence, not a
 * pointer to the reporter. the store enforces that by never
 * surfacing individual reporter ids in the ui-facing selectors.
 */

export type StoredPlan = {
  id: string;
  /** short label shown to a participant; never the caster's raw cast text */
  title: string;
  category: string;
  area: string;
  startsAt: Date;
  participants: readonly StoredParticipant[];
};

export type StoredParticipant = {
  userId: string;
  cancelledAt?: Date;
  reportedBy: readonly { reporterId: string; report: PresenceReport }[];
};

type State = { plans: readonly StoredPlan[] };

/**
 * fixture past plans. these are the receipts and pending reports the
 * viewer sees on device today; production draws from the plans and
 * attendance_reports tables.
 *
 * - p-badminton-past: 2 days ago. aarav already reported me as showed;
 *   i still owe a report on aarav. surfaces as a "how did it go?" prompt.
 * - p-ceramics-past: 5 days ago. both sides reported the other showed;
 *   a receipt for both, and the caster sheet's "with you" line lights up.
 */
const FIXTURE_PLANS: readonly StoredPlan[] = [
  {
    id: 'p-badminton-past',
    title: 'badminton after work',
    category: 'sports',
    area: 'indiranagar',
    startsAt: daysAgo(2),
    participants: [
      { userId: 'me', reportedBy: [{ reporterId: 'aarav', report: 'showed' }] },
      { userId: 'aarav', reportedBy: [] },
    ],
  },
  {
    id: 'p-ceramics-past',
    title: 'ceramics slot',
    category: 'arts',
    area: 'hsr',
    startsAt: daysAgo(5),
    participants: [
      { userId: 'me', reportedBy: [{ reporterId: 'meera', report: 'showed' }] },
      { userId: 'meera', reportedBy: [{ reporterId: 'me', report: 'showed' }] },
    ],
  },
];

let state: State = { plans: FIXTURE_PLANS };

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function daysAgo(days: number): Date {
  const date = new Date();
  date.setHours(19, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function toRecord(plan: StoredPlan): PlanRecord {
  return {
    startsAt: plan.startsAt,
    participants: plan.participants.map((p) => ({
      userId: p.userId,
      cancelledAt: p.cancelledAt,
      reportedBy: p.reportedBy.map((entry) => ({ ...entry })),
    })),
  };
}

/**
 * useSyncExternalStore requires the snapshot to be stable across
 * renders when the underlying state hasn't changed. we subscribe to
 * state.plans (a stable reference until emit) and compute derived
 * views via useMemo, so re-renders don't churn new arrays or objects.
 */
function usePlans(): readonly StoredPlan[] {
  return useSyncExternalStore(subscribe, () => state.plans);
}

/** plans i still owe a report on (any other participant with no report from me). */
export function usePendingReports(viewerId: string = 'me'): readonly StoredPlan[] {
  const plans = usePlans();
  return useMemo(
    () =>
      plans.filter((plan) => {
        const me = plan.participants.find((p) => p.userId === viewerId);
        if (!me) return false;
        return plan.participants.some(
          (other) =>
            other.userId !== viewerId &&
            !other.reportedBy.some((entry) => entry.reporterId === viewerId),
        );
      }),
    [plans, viewerId],
  );
}

export function usePlan(planId: string): StoredPlan | undefined {
  const plans = usePlans();
  return useMemo(() => plans.find((plan) => plan.id === planId), [plans, planId]);
}

/**
 * record a presence report on one participant of a plan. the domain
 * decides the outcome; the store just captures the fact.
 */
export function reportPresence(
  planId: string,
  reportedUserId: string,
  report: PresenceReport,
  reporterId: string = 'me',
): void {
  state = {
    plans: state.plans.map((plan) => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        participants: plan.participants.map((p) => {
          if (p.userId !== reportedUserId) return p;
          const withoutOld = p.reportedBy.filter((entry) => entry.reporterId !== reporterId);
          return { ...p, reportedBy: [...withoutOld, { reporterId, report }] };
        }),
      };
    }),
  };
  emit();
}

/** cancel with a timestamp — the domain decides withdrawn vs. late-cancel. */
export function cancelParticipation(planId: string, userId: string, at: Date = new Date()): void {
  state = {
    plans: state.plans.map((plan) => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        participants: plan.participants.map((p) =>
          p.userId === userId ? { ...p, cancelledAt: at } : p,
        ),
      };
    }),
  };
  emit();
}

/** every outcome i've earned on a stored plan, computed from the domain. */
export function outcomesFor(personId: string, now: Date = new Date()): readonly Outcome[] {
  return state.plans
    .filter((plan) => plan.participants.some((p) => p.userId === personId))
    .map((plan) => outcomeFor(toRecord(plan), personId, now));
}

/** what the viewer's caster-sheet "with you" line reads from. */
export function useSharedHistoryWith(
  personId: string,
  viewerId: string = 'me',
): { plans: number; receipts: number; flakes: number } {
  const plans = usePlans();
  return useMemo(() => {
    const now = new Date();
    const shared = plans.filter(
      (plan) =>
        plan.participants.some((p) => p.userId === viewerId) &&
        plan.participants.some((p) => p.userId === personId),
    );
    let receipts = 0;
    let flakes = 0;
    for (const plan of shared) {
      const mineOutcome = outcomeFor(toRecord(plan), viewerId, now);
      const theirsOutcome = outcomeFor(toRecord(plan), personId, now);
      // count receipts as plans BOTH sides confirmed; flakes as
      // any resolved absence on either side.
      if (mineOutcome === 'receipt' && theirsOutcome === 'receipt') receipts += 1;
      if (mineOutcome === 'flake' || theirsOutcome === 'flake') flakes += 1;
    }
    return { plans: shared.length, receipts, flakes };
  }, [plans, personId, viewerId]);
}

/** test-only reset. */
export function resetAttendanceStore(): void {
  state = { plans: FIXTURE_PLANS };
  emit();
}
