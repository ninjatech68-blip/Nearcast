/**
 * attendance: how receipts and flakes are established.
 *
 * a receipt is a plan both sides confirm happened. a flake is a
 * no-show established by everyone else who was there. nothing here is
 * a rating — every input is an event with a timestamp.
 *
 * the rules, in one place:
 * - CANCEL BEFORE CUTOFF (2h pre-start): withdrawn. no receipt, no
 *   flake. backing out with notice is allowed behavior, not punished.
 * - CANCEL AFTER CUTOFF or silent no-show, when the plan verifiably
 *   happened (all other participants confirmed it and marked you
 *   absent): flake.
 * - MUTUAL CONFIRM within the window (start → start+24h): receipt for
 *   everyone confirmed present by the others.
 * - NOBODY CONFIRMS in the window: unverified. no receipts, no flakes.
 *   silence never creates a fact.
 * - CONFLICTING REPORTS (one says you showed, another says you
 *   didn't): disputed → neutral. the tie always goes to no-penalty;
 *   repeated disputes are a pattern-review signal, not a score.
 * - SAME-PAIR THROTTLE: receipts between the same two people count at
 *   most once per 7 days. two friends cannot farm signal in a weekend.
 *
 * pure domain: no react, no supabase, no i/o.
 */

export const CANCEL_CUTOFF_HOURS = 2;
export const CONFIRM_WINDOW_HOURS = 24;
export const SAME_PAIR_THROTTLE_DAYS = 7;

export type PresenceReport = 'showed' | 'no-show';

export type ParticipantRecord = {
  userId: string;
  /** when they backed out, if they did */
  cancelledAt?: Date;
  /** what each OTHER participant reported about this person */
  reportedBy: readonly { reporterId: string; report: PresenceReport }[];
};

export type PlanRecord = {
  startsAt: Date;
  participants: readonly ParticipantRecord[];
};

export type Outcome = 'receipt' | 'flake' | 'withdrawn' | 'unverified' | 'disputed';

export function outcomeFor(plan: PlanRecord, userId: string, now: Date): Outcome {
  const person = plan.participants.find((participant) => participant.userId === userId);
  if (!person) return 'unverified';

  // withdrawal with notice is not a flake, ever.
  if (person.cancelledAt) {
    const cutoff = new Date(plan.startsAt.getTime() - CANCEL_CUTOFF_HOURS * 3600000);
    if (person.cancelledAt <= cutoff) return 'withdrawn';
    // late cancel is judged like a no-show: only the others' reports decide.
  }

  const windowClosed = now.getTime() > plan.startsAt.getTime() + CONFIRM_WINDOW_HOURS * 3600000;
  const reports = person.reportedBy;

  if (reports.length === 0) {
    // silence never creates a fact — in either direction.
    return windowClosed ? 'unverified' : 'unverified';
  }

  const showed = reports.filter((entry) => entry.report === 'showed').length;
  const noShow = reports.filter((entry) => entry.report === 'no-show').length;

  // conflicting reports: the tie goes to no-penalty.
  if (showed > 0 && noShow > 0) return 'disputed';

  if (noShow > 0) {
    // a flake needs the window closed and unanimous absence from everyone who reported.
    return windowClosed ? 'flake' : 'unverified';
  }

  // unanimous 'showed' is a receipt as soon as it exists.
  return 'receipt';
}

/**
 * anti-farming: how much a new receipt between two people counts,
 * given the timestamps of their previous mutual receipts.
 */
export function receiptWeight(previousMutualReceipts: readonly Date[], at: Date): 0 | 1 {
  const throttleMs = SAME_PAIR_THROTTLE_DAYS * 86400000;
  const recent = previousMutualReceipts.some(
    (previous) => at.getTime() - previous.getTime() < throttleMs && at.getTime() >= previous.getTime(),
  );
  return recent ? 0 : 1;
}
