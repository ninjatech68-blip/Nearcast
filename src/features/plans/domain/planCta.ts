import type { PlanStatus, PlanType } from './enums';

export type MyPlanStatus = 'none' | 'going' | 'requested' | 'left';
export type Eligibility =
  | { ok: true }
  | { ok: false; code: 'verified_required' | 'women_only_required' | 'connections_required' };

export type PlanCtaInput = {
  isHost: boolean;
  planType: PlanType;
  planStatus: PlanStatus;
  myStatus: MyPlanStatus;
  capacity: number | null;
  goingCount: number;
  eligibility: Eligibility;
  viewerRestricted: boolean;
  offline: boolean;
  hostFirstName: string;
};

export type PlanCta = {
  kind: 'join' | 'ask' | 'manage' | 'going' | 'pending' | 'full' | 'ineligible' | 'restricted' | 'closed';
  label: string;
  enabled: boolean;
  /** Shown under the button. Always present when `enabled` is false. */
  reason?: string;
  secondary?: 'Open chat' | 'Withdraw';
};

const INELIGIBLE: Record<Exclude<Eligibility, { ok: true }>['code'], string> = {
  verified_required: 'This plan is for verified people. Get verified →',
  women_only_required: 'This plan is for verified women. Get verified →',
  connections_required: 'This plan is for friends and friends of friends.',
};

/** The single primary action on a plan card (04 S11). */
export function planCta(input: PlanCtaInput): PlanCta {
  const { planType, planStatus, myStatus, hostFirstName } = input;

  if (input.isHost) return { kind: 'manage', label: 'Manage plan', enabled: true };

  if (myStatus === 'going' && !['ended', 'cancelled'].includes(planStatus)) {
    return { kind: 'going', label: "You're in", enabled: true, secondary: 'Open chat' };
  }

  if (planStatus === 'ended') return closed('This plan has ended.');
  if (planStatus === 'cancelled') return closed(`${hostFirstName} cancelled this plan.`);
  if (planStatus === 'started') return closed('This plan has started.');
  if (planStatus !== 'live' && planStatus !== 'full') return closed("This plan isn't open right now.");

  if (myStatus === 'requested') {
    return {
      kind: 'pending',
      label: `Asked · waiting for ${hostFirstName}`,
      enabled: false,
      reason: `${hostFirstName} will reply here.`,
      secondary: 'Withdraw',
    };
  }

  if (input.viewerRestricted) {
    return {
      kind: 'restricted',
      label: planType === 'plan' ? "I'm in" : askLabel(planType),
      enabled: false,
      reason: 'Your account is limited right now. Contact support.',
    };
  }

  if (!input.eligibility.ok) {
    return {
      kind: 'ineligible',
      label: planType === 'plan' ? "I'm in" : askLabel(planType),
      enabled: false,
      reason: INELIGIBLE[input.eligibility.code],
    };
  }

  const isFull =
    planStatus === 'full' || (input.capacity !== null && input.goingCount >= input.capacity);
  if (isFull) return { kind: 'full', label: 'Full', enabled: false, reason: 'No spots left.' };

  if (planType === 'plan') {
    return input.offline
      ? { kind: 'join', label: "I'm in", enabled: true, reason: "We'll confirm when you're back online" }
      : { kind: 'join', label: "I'm in", enabled: true };
  }

  return input.offline
    ? { kind: 'ask', label: askLabel(planType), enabled: false, reason: "You're offline" }
    : { kind: 'ask', label: askLabel(planType), enabled: true };
}

function askLabel(planType: Exclude<PlanType, 'plan'> | PlanType): string {
  return planType === 'offer' ? "I'll take it" : 'Ask to join';
}

function closed(label: string): PlanCta {
  return { kind: 'closed', label, enabled: false, reason: label };
}
