import { describe, expect, it, jest } from '@jest/globals';
import { Keyboard } from 'react-native';
import { render, userEvent } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
  },
  useLocalSearchParams: () => ({ primitive: 'request', statement: 'Chai at 7 near Indiranagar' }),
}));

jest.mock('expo-symbols', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');

  return {
    SymbolView: ({ fallback }: { fallback?: React.ReactNode }) => <Text>{fallback}</Text>,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CreateCastScreen = require('./app/create').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PreviewCastScreen = require('./app/preview').default;

describe('cast composer', () => {
  it('is titled as a new cast', async () => {
    const view = await render(<CreateCastScreen />);

    expect(view.getByText('New cast')).toBeTruthy();
  });

  it('labels both steps visibly rather than leaning on a placeholder', async () => {
    const view = await render(<CreateCastScreen />);

    expect(view.getByText('What kind of cast is this?')).toBeTruthy();
    expect(view.getByText("What's the invite?")).toBeTruthy();
  });

  it('uses a concrete local example as the placeholder', async () => {
    const view = await render(<CreateCastScreen />);

    expect(view.getByPlaceholderText('Chai at 7 near Indiranagar')).toBeTruthy();
  });

  it('explains what enables the disabled action', async () => {
    const view = await render(<CreateCastScreen />);

    expect(view.getByText('Write a line about your plan to continue.')).toBeTruthy();
  });

  it('stops explaining once the action is available', async () => {
    const user = userEvent.setup();
    const view = await render(<CreateCastScreen />);

    await user.type(view.getByLabelText("What's the invite?"), 'Badminton at 8 in Indiranagar');

    expect(view.queryByText('Write a line about your plan to continue.')).toBeNull();
  });

  it('keeps a specific verb on the primary action', async () => {
    const view = await render(<CreateCastScreen />);

    expect(view.getByText('Review cast')).toBeTruthy();
  });

  it('still carries the three intent primitives', async () => {
    const view = await render(<CreateCastScreen />);

    expect(view.getByText('I need')).toBeTruthy();
    expect(view.getByText('I offer')).toBeTruthy();
    expect(view.getByText('I want to')).toBeTruthy();
  });

  it('moves to preview with the typed cast', async () => {
    const user = userEvent.setup();
    const view = await render(<CreateCastScreen />);

    await user.type(view.getByLabelText("What's the invite?"), 'Badminton at 8 in Indiranagar');
    await user.press(view.getByRole('button', { name: 'Review cast' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/preview',
      params: { primitive: 'request', statement: 'Badminton at 8 in Indiranagar' },
    });
  });
});

describe('cast preview', () => {
  it('names the publish action in cast language', async () => {
    const view = await render(<PreviewCastScreen />);

    expect(view.getByText('Post cast')).toBeTruthy();
  });

  it('asks who can see the cast', async () => {
    const view = await render(<PreviewCastScreen />);

    expect(view.getByText('Who can see this cast?')).toBeTruthy();
  });
});
