import { describe, expect, it, jest } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

import { AppearanceProvider } from '@/design-system/appearance';
import { colorsFor } from '@/design-system/tokens';

import { DeliveryReasonRow, MISSING_REASON_COPY } from './delivery-reason-row';
import { PRIVACY_HINT_LINES, PrivacyHint } from './privacy-hint';
import { TrustBadge } from './trust-badge';
import { WhyShownChip } from './why-shown-chip';

describe('TrustBadge', () => {
  it('renders a factual trust-context line', async () => {
    const view = await render(
      <TrustBadge context="8 of 9 confirmed interactions were completed" />,
    );

    expect(view.getByText('8 of 9 confirmed interactions were completed')).toBeTruthy();
  });

  it('includes a verified signal when one is supplied', async () => {
    const view = await render(
      <TrustBadge
        context="One trusted connection from your network"
        verifiedSignal="Phone verified. Verification does not guarantee safety."
      />,
    );

    expect(
      view.getByLabelText(
        'One trusted connection from your network. Phone verified. Verification does not guarantee safety.',
      ),
    ).toBeTruthy();
  });

  it('renders as neutral context, not a green confirmation', async () => {
    const view = await render(
      <AppearanceProvider appearance="light">
        <TrustBadge context="One trusted connection from your network" />
      </AppearanceProvider>,
    );

    const badge = view.getByLabelText('One trusted connection from your network');
    const style = Object.assign(
      {},
      ...[badge.parent?.props.style ?? badge.props.style]
        .flat(Number.POSITIVE_INFINITY)
        .filter(Boolean),
    );
    expect(style.backgroundColor).toBe(colorsFor('light').background.surfaceMuted);
  });

  it('refuses the banned universal-score shape', async () => {
    await expect(render(<TrustBadge context="Trust 812 · High trust" />)).rejects.toThrow(
      /score/i,
    );
  });

  it('refuses popularity-shaped trust values', async () => {
    await expect(render(<TrustBadge context="4.7 stars" />)).rejects.toThrow(
      /rating|percentage|popularity/i,
    );
  });
});

describe('WhyShownChip', () => {
  it('renders the reason inline, at caption size, when there is nothing to open', async () => {
    const view = await render(<WhyShownChip reason="approximate area + public link" />);

    const reason = view.getByText('Shown because: approximate area + public link');
    const style = Object.assign(
      {},
      ...[reason.props.style].flat(Number.POSITIVE_INFINITY).filter(Boolean),
    );
    expect(style.fontSize).toBeGreaterThanOrEqual(13);
  });

  it('keeps the reason reachable as a hint when it opens an explanation', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    const view = await render(
      <WhyShownChip onPress={onPress} reason="approximate area + public link" />,
    );

    const chip = view.getByRole('button', { name: "Why you're seeing this" });
    expect(chip.props.accessibilityHint).toBe('Shown because: approximate area + public link');

    await user.press(chip);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('PrivacyHint', () => {
  it('uses the approved privacy copy by default', async () => {
    const view = await render(<PrivacyHint />);

    for (const line of PRIVACY_HINT_LINES) {
      expect(view.getByText(line)).toBeTruthy();
    }
  });

  it('states that reach never expands without user action', async () => {
    expect(PRIVACY_HINT_LINES).toContain('Reach never expands without your action.');
  });
});

describe('DeliveryReasonRow', () => {
  it('shows the stored reason and its delivery time', async () => {
    const view = await render(
      <DeliveryReasonRow deliveredAt="Delivered 2 hours ago" reason="You play nearby on weekday evenings." />,
    );

    expect(view.getByText('You play nearby on weekday evenings.')).toBeTruthy();
    expect(view.getByText('Delivered 2 hours ago')).toBeTruthy();
  });

  it('says the reason is unavailable rather than inventing one', async () => {
    const view = await render(<DeliveryReasonRow reason="   " />);

    expect(view.getByText(MISSING_REASON_COPY)).toBeTruthy();
  });
});

describe('appearance', () => {
  it('renders trust context on the dark palette without changing its copy', async () => {
    const view = await render(
      <AppearanceProvider appearance="dark">
        <TrustBadge context="One trusted connection from your network" />
      </AppearanceProvider>,
    );

    expect(view.getByText('One trusted connection from your network')).toBeTruthy();
  });
});
