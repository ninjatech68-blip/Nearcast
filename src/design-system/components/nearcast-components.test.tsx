import { describe, expect, it, jest } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

import { colorsFor } from '@/design-system/tokens';

import { COMPOSER_HELPER_COPY, Composer } from './composer';
import { IntentCard } from './intent-card';
import { NativeSheet } from './native-sheet';
import { PRIVACY_HINT_LINES } from './privacy-hint';
import { CONSENT_COPY, ReachOptionCard } from './reach-option-card';
import { REVIEW_HEADING, ReviewIntentCard } from './review-intent-card';
import { StatePanel } from './state-panel';

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Number.POSITIVE_INFINITY).filter(Boolean));

const intent = {
  broadcaster: { name: 'Aarav', context: 'One trusted connection' },
  trust: { context: '8 of 9 confirmed interactions were completed' },
  area: 'Indiranagar area',
  category: 'Sport',
  summary: 'Two people for badminton tonight',
  reason: 'approximate area + public link',
};

describe('StatePanel', () => {
  it('announces loading as busy', async () => {
    const view = await render(<StatePanel state="loading" title="Loading intents" />);

    expect(
      view.getByRole('header', { name: 'Loading intents' }).props.accessibilityState,
    ).toMatchObject({ busy: true });
  });

  it('raises errors as alerts and offers retry with recovery styling, not danger', async () => {
    const view = await render(
      <StatePanel
        action={{ label: 'Try again', onPress: jest.fn() }}
        description="We could not reach the network."
        state="error"
        title="Something went wrong"
      />,
    );

    expect(view.getByRole('alert')).toBeTruthy();

    const retry = flatten(view.getByRole('button', { name: 'Try again' }).props.style);
    expect(retry.backgroundColor).toBe('transparent');
    expect(retry.borderColor).toBe(colorsFor('light').action.primary);
  });

  it('explains a disabled state and blocks its action', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    const view = await render(
      <StatePanel
        action={{ label: 'Offer help', onPress }}
        reason="You need an approved neighbourhood to offer help."
        state="disabled"
        title="Not available yet"
      />,
    );

    const button = view.getByRole('button', { name: 'Offer help' });
    expect(button.props.accessibilityHint).toBe(
      'You need an approved neighbourhood to offer help.',
    );

    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it('queues offline work instead of reporting an error', async () => {
    const view = await render(
      <StatePanel
        description="Your reply will send when you reconnect."
        state="offline"
        title="Offline"
      />,
    );

    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByText('Your reply will send when you reconnect.')).toBeTruthy();
  });
});

describe('ReachOptionCard', () => {
  const option = {
    title: 'Nearby and relevant',
    audience: 'People nearby who match this intent',
    privacyConsequence: 'Your approximate area is shared. Your identity is not.',
  };

  it('exposes reach choices as radios carrying their privacy consequence', async () => {
    const view = await render(
      <ReachOptionCard {...option} onSelect={jest.fn()} selected={false} />,
    );

    const card = view.getByRole('radio');
    expect(card.props.accessibilityState).toMatchObject({ selected: false });
    expect(card.props.accessibilityHint).toContain(
      'Your approximate area is shared. Your identity is not.',
    );
  });

  it('warns before an option widens reach', async () => {
    const view = await render(
      <ReachOptionCard {...option} expandsReach onSelect={jest.fn()} selected={false} />,
    );

    expect(view.getByText(CONSENT_COPY)).toBeTruthy();
    expect(view.getByRole('radio').props.accessibilityHint).toContain(CONSENT_COPY);
  });

  it('only changes reach when the user presses it', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();

    const view = await render(
      <ReachOptionCard {...option} expandsReach onSelect={onSelect} selected={false} />,
    );

    expect(onSelect).not.toHaveBeenCalled();

    await user.press(view.getByRole('radio'));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe('IntentCard', () => {
  it('opens intent detail from the whole card', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    const view = await render(<IntentCard {...intent} onPress={onPress} />);

    await user.press(view.getByRole('button', { name: 'Two people for badminton tonight' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });


  it('renders the approved anatomy', async () => {
    const view = await render(<IntentCard {...intent} />);

    expect(view.getByText('Aarav')).toBeTruthy();
    expect(view.getByText('8 of 9 confirmed interactions were completed')).toBeTruthy();
    expect(view.getByText('Indiranagar area')).toBeTruthy();
    expect(view.getByText('Sport')).toBeTruthy();
    expect(view.getByText('Two people for badminton tonight')).toBeTruthy();
    expect(view.getByText('Shown because: approximate area + public link')).toBeTruthy();
  });

  it('refuses to render an exact location', async () => {
    await expect(render(<IntentCard {...intent} area="221 Baker Street" />)).rejects.toThrow(
      /approximate area/i,
    );
  });

  it('refuses to render contact details', async () => {
    await expect(
      render(<IntentCard {...intent} summary="Badminton tonight, call 555 010 2233" />),
    ).rejects.toThrow(/contact details/i);
  });

  it('disables the action on an expired intent and says why', async () => {
    const onPress = jest.fn();

    const view = await render(
      <IntentCard {...intent} action={{ label: 'Offer help', onPress }} status="expired" />,
    );

    const button = view.getByRole('button', { name: 'Offer help' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    expect(button.props.accessibilityHint).toBe('The response window ended.');
    expect(view.getByText('Expired')).toBeTruthy();
  });

  it('queues an action taken offline rather than blocking it silently', async () => {
    const view = await render(
      <IntentCard {...intent} action={{ label: 'Offer help', onPress: jest.fn() }} offline />,
    );

    expect(view.getByRole('button', { name: 'Offer help' }).props.accessibilityHint).toBe(
      'You are offline. This will send when you reconnect.',
    );
  });

  it('reports the saved state through the save control', async () => {
    const view = await render(<IntentCard {...intent} onSave={jest.fn()} saved />);

    expect(view.getByRole('button', { name: 'Saved' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
  });
});

describe('ReviewIntentCard', () => {
  const preview = {
    broadcasterName: 'Aarav',
    area: 'Indiranagar area',
    category: 'Sport',
    summary: 'Two people for badminton tonight',
    expiry: 'Expires in 7 hours',
  };

  it('shows exactly what other people will receive, with the privacy hint', async () => {
    const view = await render(<ReviewIntentCard {...preview} />);

    expect(view.getByText(REVIEW_HEADING)).toBeTruthy();
    expect(view.getByText('Two people for badminton tonight')).toBeTruthy();
    expect(view.getByText('Expires in 7 hours')).toBeTruthy();

    for (const line of PRIVACY_HINT_LINES) {
      expect(view.getByText(line)).toBeTruthy();
    }
  });

  it('refuses to preview contact details', async () => {
    await expect(
      render(<ReviewIntentCard {...preview} summary="Badminton tonight, email aarav@example.com" />),
    ).rejects.toThrow(/contact details/i);
  });
});

describe('Composer', () => {
  it('labels the field and shows the approved helper copy', async () => {
    const view = await render(
      <Composer
        label="What do you need?"
        onChangeText={jest.fn()}
        submit={{ label: 'Review', onPress: jest.fn() }}
        value=""
      />,
    );

    expect(view.getByLabelText('What do you need?')).toBeTruthy();
    expect(view.getByText(COMPOSER_HELPER_COPY)).toBeTruthy();
  });

  it('blocks submission of an empty draft and says why', async () => {
    const view = await render(
      <Composer
        label="What do you need?"
        onChangeText={jest.fn()}
        submit={{ label: 'Review', onPress: jest.fn() }}
        value="   "
      />,
    );

    const button = view.getByRole('button', { name: 'Review' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    expect(button.props.accessibilityHint).toBe('Write your intent to continue.');
  });

  it('warns about contact details in the draft and holds the submission', async () => {
    const view = await render(
      <Composer
        label="What do you need?"
        onChangeText={jest.fn()}
        submit={{ label: 'Review', onPress: jest.fn() }}
        value="Badminton tonight, call 555 010 2233"
      />,
    );

    expect(
      view.getByText('Remove contact details. They are never shown to other people.'),
    ).toBeTruthy();
    expect(view.getByRole('button', { name: 'Review' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('counts the characters left against the limit', async () => {
    const view = await render(
      <Composer
        label="What do you need?"
        maxLength={100}
        onChangeText={jest.fn()}
        submit={{ label: 'Review', onPress: jest.fn() }}
        value="Badminton tonight"
      />,
    );

    expect(view.getByLabelText('83 characters remaining')).toBeTruthy();
  });

  it('lets a privacy-safe draft through', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    const view = await render(
      <Composer
        label="What do you need?"
        onChangeText={jest.fn()}
        submit={{ label: 'Review', onPress }}
        value="Two people for badminton tonight"
      />,
    );

    await user.press(view.getByRole('button', { name: 'Review' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('NativeSheet', () => {
  it('presents a titled, dismissible sheet', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    const view = await render(
      <NativeSheet onClose={onClose} title="Choose reach" visible>
        <ReachOptionCard
          audience="Only your circle"
          onSelect={jest.fn()}
          privacyConsequence="Nobody outside your circle sees this."
          selected
          title="Origin only"
        />
      </NativeSheet>,
    );

    expect(view.getByRole('header', { name: 'Choose reach' })).toBeTruthy();
    expect(view.getByRole('radio')).toBeTruthy();

    await user.press(view.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while hidden', async () => {
    const view = await render(
      <NativeSheet onClose={jest.fn()} title="Choose reach" visible={false}>
        <ReachOptionCard
          audience="Only your circle"
          onSelect={jest.fn()}
          privacyConsequence="Nobody outside your circle sees this."
          selected
          title="Origin only"
        />
      </NativeSheet>,
    );

    expect(view.queryByRole('header', { name: 'Choose reach' })).toBeNull();
  });
});
