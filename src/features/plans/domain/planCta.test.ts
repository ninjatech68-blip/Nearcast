import { describe, expect, it } from 'vitest';

import { planCta, type PlanCtaInput } from './planCta';

const base: PlanCtaInput = {
  isHost: false,
  planType: 'plan',
  planStatus: 'live',
  myStatus: 'none',
  capacity: 4,
  goingCount: 1,
  eligibility: { ok: true },
  viewerRestricted: false,
  offline: false,
  hostFirstName: 'Priya',
};

describe('plan card primary action (S11)', () => {
  it('offers "I\'m in" on an open plan', () => {
    expect(planCta(base)).toMatchObject({ kind: 'join', label: "I'm in", enabled: true });
  });

  it('offers "Ask to join" on an ask and "I\'ll take it" on an offer', () => {
    expect(planCta({ ...base, planType: 'ask', capacity: 1, goingCount: 0 })).toMatchObject({ kind: 'ask', label: 'Ask to join' });
    expect(planCta({ ...base, planType: 'offer', capacity: 1, goingCount: 0 })).toMatchObject({ kind: 'ask', label: "I'll take it" });
  });

  it('lets the host manage instead of join', () => {
    expect(planCta({ ...base, isHost: true })).toMatchObject({ kind: 'manage', label: 'Manage plan', enabled: true });
  });

  it('shows the joined state with chat and leave', () => {
    expect(planCta({ ...base, myStatus: 'going' })).toMatchObject({
      kind: 'going', label: "You're in", enabled: true, secondary: 'Open chat',
    });
  });

  it('shows a pending request with withdraw', () => {
    expect(planCta({ ...base, planType: 'ask', capacity: 1, goingCount: 0, myStatus: 'requested' })).toMatchObject({
      kind: 'pending', label: 'Asked · waiting for Priya', enabled: false, secondary: 'Withdraw',
    });
  });

  it('disables a full plan', () => {
    expect(planCta({ ...base, goingCount: 4 })).toMatchObject({ kind: 'full', label: 'Full', enabled: false });
    expect(planCta({ ...base, planStatus: 'full' })).toMatchObject({ kind: 'full', enabled: false });
  });

  it('never treats a plan with no limit as full', () => {
    expect(planCta({ ...base, capacity: null, goingCount: 150 })).toMatchObject({ kind: 'join', enabled: true });
  });

  it('explains attribute gates with a way forward', () => {
    expect(planCta({ ...base, eligibility: { ok: false, code: 'verified_required' } })).toMatchObject({
      kind: 'ineligible', enabled: false, reason: 'This plan is for verified people. Get verified →',
    });
    expect(planCta({ ...base, eligibility: { ok: false, code: 'women_only_required' } })).toMatchObject({
      kind: 'ineligible', enabled: false, reason: 'This plan is for verified women. Get verified →',
    });
  });

  it('blocks restricted viewers from joining but keeps plans they are in', () => {
    expect(planCta({ ...base, viewerRestricted: true })).toMatchObject({
      kind: 'restricted', enabled: false, reason: 'Your account is limited right now. Contact support.',
    });
    expect(planCta({ ...base, viewerRestricted: true, myStatus: 'going' })).toMatchObject({ kind: 'going' });
  });

  it('queues "I\'m in" offline but not an ask', () => {
    expect(planCta({ ...base, offline: true })).toMatchObject({
      kind: 'join', enabled: true, reason: "We'll confirm when you're back online",
    });
    expect(planCta({ ...base, planType: 'ask', capacity: 1, goingCount: 0, offline: true })).toMatchObject({
      kind: 'ask', enabled: false, reason: "You're offline",
    });
  });

  it('closes ended, cancelled and started plans for people not going', () => {
    expect(planCta({ ...base, planStatus: 'ended' })).toMatchObject({ kind: 'closed', label: 'This plan has ended.', enabled: false });
    expect(planCta({ ...base, planStatus: 'cancelled' })).toMatchObject({ kind: 'closed', label: 'Priya cancelled this plan.' });
    expect(planCta({ ...base, planStatus: 'started' })).toMatchObject({ kind: 'closed', label: 'This plan has started.' });
  });

  it('closes plans that are not open (draft or under review)', () => {
    expect(planCta({ ...base, planStatus: 'draft' })).toMatchObject({ kind: 'closed', enabled: false });
    expect(planCta({ ...base, planStatus: 'restricted' })).toMatchObject({ kind: 'closed', enabled: false });
  });

  it('keeps the joined state after the plan starts', () => {
    expect(planCta({ ...base, planStatus: 'started', myStatus: 'going' })).toMatchObject({ kind: 'going' });
  });

  it('lets someone who left join again', () => {
    expect(planCta({ ...base, myStatus: 'left' })).toMatchObject({ kind: 'join', enabled: true });
  });

  it('treats an ask as full once someone is accepted', () => {
    expect(planCta({ ...base, planType: 'ask', capacity: 1, goingCount: 1 })).toMatchObject({ kind: 'full', enabled: false });
  });

  it('always gives a reason when disabled', () => {
    const disabled = [
      planCta({ ...base, goingCount: 4 }),
      planCta({ ...base, planStatus: 'ended' }),
      planCta({ ...base, viewerRestricted: true }),
      planCta({ ...base, eligibility: { ok: false, code: 'connections_required' } }),
      planCta({ ...base, planType: 'ask', capacity: 1, goingCount: 0, myStatus: 'requested' }),
    ];
    for (const cta of disabled) {
      expect(cta.enabled).toBe(false);
      expect(cta.reason ?? cta.label).toBeTruthy();
    }
  });
});
