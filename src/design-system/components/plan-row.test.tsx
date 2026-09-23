import { describe, expect, it, jest } from '@jest/globals';
import { userEvent } from '@testing-library/react-native';

import { PlanRow, type PlanRowModel } from './plan-row';
import { renderThemed } from './test-utils';

const now = new Date('2026-09-23T10:00:00+05:30');
const plan: PlanRowModel = {
  id: 'p1',
  emoji: '🏸',
  title: 'Badminton tonight',
  categoryGroup: 'Sport',
  areaName: 'Sector 8',
  startsAt: new Date('2026-09-23T20:00:00+05:30'),
  endsAt: new Date('2026-09-23T22:00:00+05:30'),
  distanceMeters: 2600,
  goingCount: 3,
  goingPreview: [{ firstName: 'Priya' }, { firstName: 'Arjun' }, { firstName: 'Neha' }],
  reason: 'Priya is going',
};

describe('PlanRow', () => {
  for (const scheme of ['light', 'dark'] as const) {
    it(`shows title, area, time, distance, going and reason (${scheme})`, async () => {
      const view = await renderThemed(
        <PlanRow now={now} onPress={() => {}} plan={plan} timeZone="Asia/Kolkata" unit="km" />,
        scheme,
      );
      expect(view.getByText('Badminton tonight')).toBeTruthy();
      expect(view.getByText('Sector 8 · ≈ 3 km')).toBeTruthy();
      expect(view.getByText('tonight 8 pm')).toBeTruthy();
      expect(view.getByLabelText('3 going')).toBeTruthy();
      expect(view.getByText('Priya is going')).toBeTruthy();
    });
  }

  it('announces the whole row as one button with the reason', async () => {
    const onPress = jest.fn();
    const view = await renderThemed(
      <PlanRow now={now} onPress={onPress} plan={plan} timeZone="Asia/Kolkata" unit="km" />,
    );
    const row = view.getByRole('button', { name: /Badminton tonight, Sector 8, tonight 8 pm, 3 going\. Why you're seeing this: Priya is going/ });
    await userEvent.setup().press(row);
    expect(onPress).toHaveBeenCalledWith('p1');
  });

  it('offers "Not for me" when a handler is given', async () => {
    const onNotForMe = jest.fn();
    const view = await renderThemed(
      <PlanRow now={now} onNotForMe={onNotForMe} onPress={() => {}} plan={plan} timeZone="Asia/Kolkata" unit="km" />,
    );
    await userEvent.setup().press(view.getByRole('button', { name: 'Not for me' }));
    expect(onNotForMe).toHaveBeenCalledWith('p1');
  });

  it('omits distance when unknown and the going stack when nobody is going', async () => {
    const view = await renderThemed(
      <PlanRow now={now} onPress={() => {}} plan={{ ...plan, distanceMeters: null, goingCount: 0, goingPreview: [], reason: 'Near you' }} timeZone="Asia/Kolkata" unit="km" />,
    );
    expect(view.getByText('Sector 8')).toBeTruthy();
    expect(view.queryByLabelText(/\d+ going/)).toBeNull();
  });

  it('refuses to render without a reason', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      renderThemed(<PlanRow now={now} onPress={() => {}} plan={{ ...plan, reason: ' ' }} timeZone="Asia/Kolkata" unit="km" />),
    ).rejects.toThrow('requires a reason');
  });
});
