import { describe, expect, it, jest } from '@jest/globals';
import { userEvent } from '@testing-library/react-native';

import { planCta } from '@/features/plans/domain/planCta';

import { PrimaryPlanCTA } from './primary-plan-cta';
import { renderThemed } from './test-utils';

const base = {
  isHost: false, planType: 'plan' as const, planStatus: 'live' as const, myStatus: 'none' as const,
  capacity: 4, goingCount: 1, eligibility: { ok: true } as const, viewerRestricted: false, offline: false,
  hostFirstName: 'Priya',
};

describe('PrimaryPlanCTA', () => {
  it('runs the primary action', async () => {
    const onPrimary = jest.fn();
    const view = await renderThemed(<PrimaryPlanCTA cta={planCta(base)} onPrimary={onPrimary} />);
    await userEvent.setup().press(view.getByRole('button', { name: "I'm in" }));
    expect(onPrimary).toHaveBeenCalled();
  });

  it('shows the disabled reason and blocks the press', async () => {
    const onPrimary = jest.fn();
    const view = await renderThemed(
      <PrimaryPlanCTA cta={planCta({ ...base, eligibility: { ok: false, code: 'verified_required' } })} onPrimary={onPrimary} />,
      'dark',
    );
    expect(view.getByText('This plan is for verified people. Get verified →')).toBeTruthy();
    await userEvent.setup().press(view.getByRole('button', { name: "I'm in" }));
    expect(onPrimary).not.toHaveBeenCalled();
  });

  it('shows the secondary action when there is one', async () => {
    const onSecondary = jest.fn();
    const view = await renderThemed(
      <PrimaryPlanCTA cta={planCta({ ...base, myStatus: 'going' })} onPrimary={() => {}} onSecondary={onSecondary} />,
    );
    await userEvent.setup().press(view.getByRole('button', { name: 'Open chat' }));
    expect(onSecondary).toHaveBeenCalled();
  });

  it('shows a closed plan as text, not a button', async () => {
    const view = await renderThemed(<PrimaryPlanCTA cta={planCta({ ...base, planStatus: 'ended' })} onPrimary={() => {}} />);
    expect(view.getByText('This plan has ended.')).toBeTruthy();
    expect(view.queryByRole('button')).toBeNull();
  });

  it('shows loading while the action is in flight', async () => {
    const view = await renderThemed(<PrimaryPlanCTA cta={planCta(base)} loading onPrimary={() => {}} />);
    expect(view.getByRole('button').props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });
});
