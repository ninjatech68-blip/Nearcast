import { useMemo, useSyncExternalStore } from 'react';

import { outcomeFor, type Outcome, type PlanRecord, type PresenceReport } from '@/features/casts/domain/attendance';
import {
  attendanceEnabled,
  fetchPlansToReport,
  fetchReceipts,
  fetchSharedHistory,
  reportPresenceRemote,
} from './remote-attendance';
import {
  clearState,
  loadState,
  registerStoreReset,
  saveState,
  STORAGE_KEYS,
} from '@/infrastructure/persistence/storage';

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
  /** the person's first name, from the server; fixtures resolve locally */
  displayName?: string;
  cancelledAt?: Date;
  reportedBy: readonly { reporterId: string; report: PresenceReport }[];
};

/** a past plan with my computed outcome, for the receipts screen. */
export type PastPlan = { plan: StoredPlan; outcome: Outcome; others: readonly string[] };
type SharedHistory = { plans: number; receipts: number; flakes: number };

type State = {
  plans: readonly StoredPlan[];
  /** backend caches — populated by refreshAttendance / refreshSharedHistory */
  remotePending: readonly StoredPlan[];
  remotePast: readonly PastPlan[];
  sharedHistory: Readonly<Record<string, SharedHistory>>;
};

const EMPTY_REMOTE = {
  remotePending: [] as readonly StoredPlan[],
  remotePast: [] as readonly PastPlan[],
  sharedHistory: {} as Readonly<Record<string, SharedHistory>>,
};

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

/**
 * plans persist in full. presence reports are FACTS people recorded —
 * losing them on restart would silently erase receipts and flakes,
 * which is exactly the thing the attendance domain exists to make
 * durable. Date fields survive the round trip via the storage
 * layer's ISO reviver.
 */
let state: State = { ...EMPTY_REMOTE, ...loadState<State>(STORAGE_KEYS.attendance, { plans: FIXTURE_PLANS, ...EMPTY_REMOTE }) };

const listeners = new Set<() => void>();
const emit = () => {
  saveState(STORAGE_KEYS.attendance, state);
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

registerStoreReset(() => {
  state = { plans: FIXTURE_PLANS, ...EMPTY_REMOTE };
  listeners.forEach((l) => l());
});

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
/** plans i still owe a report on (any other participant with no report from me). */
export function usePendingReports(viewerId: string = 'me'): readonly StoredPlan[] {
  const snapshot = useSyncExternalStore(subscribe, () => state);
  return useMemo(() => {
    if (attendanceEnabled()) return snapshot.remotePending;
    const plans = snapshot.plans;
    return (
      plans.filter((plan) => {
        const me = plan.participants.find((p) => p.userId === viewerId);
        if (!me) return false;
        return plan.participants.some(
          (other) =>
            other.userId !== viewerId &&
            !other.reportedBy.some((entry) => entry.reporterId === viewerId),
        );
      })
    );
  }, [snapshot, viewerId]);
}

export function usePlan(planId: string): StoredPlan | undefined {
  const snapshot = useSyncExternalStore(subscribe, () => state);
  return useMemo(() => {
    const source = attendanceEnabled() ? snapshot.remotePending : snapshot.plans;
    return source.find((plan) => plan.id === planId);
  }, [snapshot, planId]);
}

/**
 * every past plan i was in, with my computed outcome. sorted newest
 * first for the receipts screen. this is what the you-sheet's
 * "receipts" row lands on.
 */
export function useMyPastPlans(
  viewerId: string = 'me',
  now: Date = new Date(),
): readonly { plan: StoredPlan; outcome: Outcome; others: readonly string[] }[] {
  const snapshot = useSyncExternalStore(subscribe, () => state);
  return useMemo(() => {
    if (attendanceEnabled()) return snapshot.remotePast;
    return snapshot.plans
      .filter((p) => p.participants.some((x) => x.userId === viewerId))
      .slice()
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
      .map((plan) => ({
        plan,
        outcome: outcomeFor(toRecord(plan), viewerId, now),
        others: plan.participants.filter((p) => p.userId !== viewerId).map((p) => p.userId),
      }));
  }, [snapshot, viewerId, now]);
}

/**
 * record a presence report on one participant of a plan. the domain
 * decides the outcome; the store just captures the fact.
 */
export async function reportPresence(
  planId: string,
  reportedUserId: string,
  report: PresenceReport,
  reporterId: string = 'me',
): Promise<void> {
  if (attendanceEnabled()) {
    await reportPresenceRemote(planId, reportedUserId, report);
    await refreshAttendance();
    return;
  }
  state = {
    ...state,
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
    ...state,
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
  const snapshot = useSyncExternalStore(subscribe, () => state);
  return useMemo(() => {
    if (attendanceEnabled()) {
      return snapshot.sharedHistory[personId] ?? { plans: 0, receipts: 0, flakes: 0 };
    }
    const plans = snapshot.plans;
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
  }, [snapshot, personId, viewerId]);
}

/**
 * Pull the attendance state from the server: the plans I owe a report
 * on, and my own past plans with their outcomes. No-op on fixtures.
 *
 * plans_to_report returns one row per (plan, person I owe), so rows are
 * grouped back into one StoredPlan per plan with a participant per
 * person — the shape the reflect screen and the activity rows read.
 */
export async function refreshAttendance(): Promise<void> {
  if (!attendanceEnabled()) return;
  try {
  const [pending, past] = await Promise.all([fetchPlansToReport(), fetchReceipts()]);

  const byPlan = new Map<string, StoredPlan>();
  for (const row of pending) {
    const existing = byPlan.get(row.intent_id);
    const subject: StoredParticipant = {
      userId: row.subject_id,
      displayName: row.subject_first_name ?? undefined,
      reportedBy: [],
    };
    if (existing) {
      byPlan.set(row.intent_id, {
        ...existing,
        participants: [...existing.participants, subject],
      });
    } else {
      byPlan.set(row.intent_id, {
        id: row.intent_id,
        title: row.title,
        category: '',
        area: row.area ?? 'nearby',
        startsAt: row.starts_at ? new Date(row.starts_at) : new Date(),
        // 'me' is a party too, with nothing owed back to itself
        participants: [{ userId: 'me', reportedBy: [] }, subject],
      });
    }
  }

  const remotePast: PastPlan[] = past.map((row) => ({
    plan: {
      id: row.intent_id,
      title: row.title,
      category: '',
      area: row.area ?? 'nearby',
      startsAt: row.starts_at ? new Date(row.starts_at) : new Date(),
      participants: [],
    },
    outcome: row.outcome,
    others: row.other_names ?? [],
  }));

  state = { ...state, remotePending: [...byPlan.values()], remotePast };
  emit();
  } catch (error) {
    console.warn('refreshAttendance failed', error);
  }
}

/** shared-history counts with one person; caches by id. no-op on fixtures. */
export async function refreshSharedHistory(personId: string): Promise<void> {
  if (!attendanceEnabled() || !personId || personId === '__none__') return;
  try {
    const history = await fetchSharedHistory(personId);
    state = { ...state, sharedHistory: { ...state.sharedHistory, [personId]: history } };
    emit();
  } catch (error) {
    console.warn('refreshSharedHistory failed', error);
  }
}

/** test-only reset. clears the persisted record too. */
export function resetAttendanceStore(): void {
  clearState(STORAGE_KEYS.attendance);
  state = { plans: FIXTURE_PLANS, ...EMPTY_REMOTE };
  listeners.forEach((l) => l());
}
