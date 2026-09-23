import { describe, expect, it, jest } from '@jest/globals';
import { userEvent } from '@testing-library/react-native';

import { ReachDial } from './reach-dial';
import { renderThemed } from './test-utils';

const estimates = { friends: 'few' as const, friends_of_friends: 40, nearby: 210, city: 1200 };

describe('ReachDial', () => {
  it('shows every level with its honest estimate', async () => {
    const view = await renderThemed(<ReachDial city="Chandigarh" estimates={estimates} onChange={() => {}} value="nearby" />);
    expect(view.getByRole('radio', { name: 'Friends, a few people' })).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Friends of friends, ≈ 40 people' })).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Nearby, ≈ 210 people' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(view.getByRole('radio', { name: 'Anyone in Chandigarh, ≈ 1200 people' })).toBeTruthy();
  });

  it('says "estimate unavailable" instead of inventing a number', async () => {
    const view = await renderThemed(
      <ReachDial city="Chandigarh" estimates={{ friends: null, friends_of_friends: null, nearby: null, city: null }} onChange={() => {}} value="nearby" />,
    );
    expect(view.getByRole('radio', { name: 'Nearby, estimate unavailable' })).toBeTruthy();
  });

  it('changes level on press', async () => {
    const onChange = jest.fn();
    const view = await renderThemed(<ReachDial city="Chandigarh" estimates={estimates} onChange={onChange} value="nearby" />);
    await userEvent.setup().press(view.getByRole('radio', { name: /Anyone in Chandigarh/ }));
    expect(onChange).toHaveBeenCalledWith('city');
  });

  it('locks levels narrower than the published reach (reach only widens)', async () => {
    const onChange = jest.fn();
    const view = await renderThemed(
      <ReachDial city="Chandigarh" estimates={estimates} lockedBelow="nearby" onChange={onChange} value="nearby" />,
      'dark',
    );
    const friends = view.getByRole('radio', { name: /^Friends,/ });
    expect(friends.props.accessibilityState).toMatchObject({ disabled: true });
    await userEvent.setup().press(friends);
    expect(onChange).not.toHaveBeenCalled();
    expect(view.getByText("You can widen who sees it later, never narrow it.")).toBeTruthy();
  });
});
