import { describe, expect, it, jest } from '@jest/globals';
import { userEvent } from '@testing-library/react-native';

import { Avatar, initials } from './avatar';
import { Button } from './button';
import { CategoryTile } from './category-tile';
import { GoingStack } from './going-stack';
import { Icon } from './icon';
import { PrivacyStrip } from './privacy-strip';
import { ReasonLine } from './reason-line';
import { renderThemed } from './test-utils';

describe('Button', () => {
  it('presses when enabled', async () => {
    const onPress = jest.fn();
    const view = await renderThemed(<Button label="Post" onPress={onPress} />);
    await userEvent.setup().press(view.getByRole('button', { name: 'Post' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('shows the reason and blocks presses when disabled', async () => {
    const onPress = jest.fn();
    const view = await renderThemed(<Button disabled label="Next" onPress={onPress} reason="Add a few words about the plan" />, 'dark');
    expect(view.getByText('Add a few words about the plan')).toBeTruthy();
    await userEvent.setup().press(view.getByRole('button', { name: 'Next' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Avatar', () => {
  it('uses initials, never a silhouette, when there is no photo', async () => {
    expect(initials('Harpreet Singh')).toBe('HS');
    expect(initials('Priya')).toBe('P');
    const view = await renderThemed(<Avatar name="Harpreet Singh" />);
    expect(view.getByText('HS')).toBeTruthy();
    expect(view.queryByTestId('avatar-image')).toBeNull();
  });

  it('announces verification', async () => {
    const view = await renderThemed(<Avatar name="Priya" verified />);
    expect(view.getByLabelText('Priya, verified')).toBeTruthy();
  });
});

describe('GoingStack', () => {
  it('renders nothing when nobody is going (no placeholder faces)', async () => {
    const view = await renderThemed(<GoingStack count={0} people={[]} />);
    expect(view.toJSON()).toBeNull();
  });

  it('shows at most three real avatars and the exact count', async () => {
    const people = ['Priya', 'Arjun', 'Neha', 'Kabir'].map((firstName) => ({ firstName }));
    const view = await renderThemed(<GoingStack count={4} people={people} />);
    expect(view.getByLabelText('4 going')).toBeTruthy();
    expect(view.getAllByText(/^[A-Z]$/)).toHaveLength(3);
  });

  it('never shows more avatars than the real count', async () => {
    const people = ['Priya', 'Arjun', 'Neha'].map((firstName) => ({ firstName }));
    const view = await renderThemed(<GoingStack count={1} people={people} />);
    expect(view.getAllByText(/^[A-Z]$/)).toHaveLength(1);
  });
});

describe('ReasonLine', () => {
  it('shows the reason and "Not for me"', async () => {
    const onNotForMe = jest.fn();
    const view = await renderThemed(<ReasonLine onNotForMe={onNotForMe} reason="Near you" variant="box" />);
    expect(view.getByText("Why you're seeing this: Near you")).toBeTruthy();
    await userEvent.setup().press(view.getByRole('button', { name: 'Not for me' }));
    expect(onNotForMe).toHaveBeenCalled();
  });

  it('throws without a reason', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renderThemed(<ReasonLine reason="" />)).rejects.toThrow('requires a reason');
  });
});

describe('PrivacyStrip', () => {
  it('describes each state in one sentence', async () => {
    const locked = await renderThemed(<PrivacyStrip state={{ kind: 'locked' }} />);
    expect(locked.getByText('Exact spot unlocks 1 hour before, for people going.')).toBeTruthy();
    const countdown = await renderThemed(<PrivacyStrip state={{ kind: 'unlocksIn', label: '2 h 10 m' }} />, 'dark');
    expect(countdown.getByText('Spot unlocks in 2 h 10 m')).toBeTruthy();
  });
});

describe('Icon and CategoryTile', () => {
  it('labels meaningful icons and hides decorative ones', async () => {
    const meaningful = await renderThemed(<Icon label="Verified" name="verified" />);
    expect(meaningful.getByLabelText('Verified')).toBeTruthy();
    const decorative = await renderThemed(<Icon label={null} name="reason" />);
    expect(decorative.getByTestId('icon-reason', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
  });

  it('hides the emoji tile from screen readers', async () => {
    const view = await renderThemed(<CategoryTile emoji="🏸" group="Sport" />);
    expect(view.getByTestId('category-tile', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
  });
});
