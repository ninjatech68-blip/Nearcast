import { describe, expect, it, jest } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  useLocalSearchParams: () => ({
    primitive: 'plan',
    statement: 'Need two players for badminton tonight.',
    area: 'Indiranagar area',
    time: 'Tonight, 8:00 PM',
  }),
}));

jest.mock('expo-symbols', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    SymbolView: ({ fallback }: { fallback?: React.ReactNode }) => <Text>{fallback}</Text>,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PreviewIntentScreen = require('./app/preview').default;

describe('PreviewIntentScreen', () => {
  it('shows the parsed intent, reach options, and privacy status', async () => {
    const view = await render(<PreviewIntentScreen />);

    expect(view.getByText('Review intent')).toBeTruthy();
    expect(view.getByText('Need two players for badminton tonight.')).toBeTruthy();
    expect(view.getByText('Who can see this?')).toBeTruthy();
    expect(view.getByText('Trusted circles')).toBeTruthy();
    expect(view.getByText('Adjacent network')).toBeTruthy();
    expect(view.getByText('Relevant nearby')).toBeTruthy();
    expect(view.getByText('Broader approved')).toBeTruthy();
    expect(view.getByText('Contact stays hidden')).toBeTruthy();
  });

  it('lets the user pick a different reach level', async () => {
    const user = userEvent.setup();
    const view = await render(<PreviewIntentScreen />);

    const trusted = view.getByRole('radio', { name: 'Trusted circles' });
    expect(trusted.props.accessibilityState).toMatchObject({ selected: false });

    await user.press(trusted);
    expect(trusted.props.accessibilityState).toMatchObject({ selected: true });
  });
});
