import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ReachSelector } = require('@/features/reach/ui/reach-selector');

describe('ReachSelector', () => {
  const onChange = jest.fn<(target: string, confirmed: boolean) => void>();

  beforeEach(() => {
    onChange.mockReset();
  });

  it('shows the current level and every other level as a choice', async () => {
    const view = await render(
      <ReachSelector currentLevel="origin_only" onChange={onChange} />,
    );

    expect(view.getByLabelText('Current reach')).toHaveTextContent(
      /Only where you shared it/,
    );
    expect(view.getByLabelText('People you both know')).toBeTruthy();
    expect(view.getByLabelText('Nearby and relevant')).toBeTruthy();
    expect(view.getByLabelText('A wider approved group')).toBeTruthy();
  });

  it('states the audience delta and privacy impact before any expansion', async () => {
    const user = userEvent.setup();
    const view = await render(
      <ReachSelector currentLevel="origin_only" onChange={onChange} />,
    );

    await user.press(view.getByLabelText('Nearby and relevant'));

    const disclosure = view.getByLabelText('What this changes');
    expect(disclosure).toHaveTextContent(/Adds nearby people/);
    expect(disclosure).toHaveTextContent(/exact location and contact details stay private/);
  });

  it('will not expand until the disclosure is acknowledged', async () => {
    const user = userEvent.setup();
    const view = await render(
      <ReachSelector currentLevel="origin_only" onChange={onChange} />,
    );

    await user.press(view.getByLabelText('People you both know'));

    const apply = view.getByRole('button', { name: /Change to people you both know/i });
    expect(apply.props.accessibilityState).toMatchObject({ disabled: true });

    await user.press(view.getByLabelText('I understand who this will reach'));
    await user.press(view.getByRole('button', { name: /Change to people you both know/i }));

    expect(onChange).toHaveBeenCalledWith('adjacent_network', true);
  });

  it('never asks for a confirmation to take reach back', async () => {
    const user = userEvent.setup();
    const view = await render(
      <ReachSelector currentLevel="broader_approved" onChange={onChange} />,
    );

    await user.press(view.getByLabelText('Only where you shared it'));

    expect(view.queryByLabelText('I understand who this will reach')).toBeNull();

    await user.press(
      view.getByRole('button', { name: /Change to only where you shared it/i }),
    );
    expect(onChange).toHaveBeenCalledWith('origin_only', false);
  });

  it('is honest that reducing reach cannot unsee what was seen', async () => {
    const user = userEvent.setup();
    const view = await render(
      <ReachSelector currentLevel="broader_approved" onChange={onChange} />,
    );

    await user.press(view.getByLabelText('People you both know'));

    expect(view.getByLabelText('What this changes')).toHaveTextContent(
      /may still remember it/,
    );
  });

  it('never quotes an audience size', async () => {
    const user = userEvent.setup();
    const view = await render(
      <ReachSelector currentLevel="origin_only" onChange={onChange} />,
    );

    await user.press(view.getByLabelText('A wider approved group'));

    expect(view.queryByText(/\d+ people/)).toBeNull();
  });

  it('resets the acknowledgement when a different level is chosen', async () => {
    const user = userEvent.setup();
    const view = await render(
      <ReachSelector currentLevel="origin_only" onChange={onChange} />,
    );

    await user.press(view.getByLabelText('People you both know'));
    await user.press(view.getByLabelText('I understand who this will reach'));
    await user.press(view.getByLabelText('A wider approved group'));

    expect(
      view.getByRole('button', { name: /Change to a wider approved group/i }).props
        .accessibilityState,
    ).toMatchObject({ disabled: true });
  });
});
