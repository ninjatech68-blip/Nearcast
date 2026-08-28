import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';

const mockLoadAsync = jest.fn<(fontMap: unknown) => Promise<void>>();
const mockHideAsync = jest.fn<() => Promise<void>>();
const mockPreventAutoHideAsync = jest.fn<() => Promise<void>>();

jest.mock('expo-font', () => ({
  loadAsync: (fontMap: unknown) => mockLoadAsync(fontMap),
}));

// the real SafeAreaProvider withholds children until it measures a
// layout, which never happens under jest. Pass them through.
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context') as Record<string, unknown>;
  return {
    ...actual,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('expo-splash-screen', () => ({
  hideAsync: () => mockHideAsync(),
  preventAutoHideAsync: () => mockPreventAutoHideAsync(),
}));

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text, View } = require('react-native');

  function Stack({ children }: { children: React.ReactNode }) {
    return <View testID="root-stack">{children}</View>;
  }

  Stack.Screen = function Screen({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };

  return {
    Stack,
    router: { back: () => undefined, push: () => undefined, replace: () => undefined },
    useSegments: () => [],
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RootLayout = require('./app/_layout').default;

describe('RootLayout', () => {
  beforeEach(() => {
    mockLoadAsync.mockReset();
    mockHideAsync.mockReset();
    mockPreventAutoHideAsync.mockReset();
  });

  it('loads both v2 families before showing the app shell', async () => {
    let finishLoadingFonts: () => void = () => undefined;
    mockLoadAsync.mockReturnValue(
      new Promise<void>((resolve) => {
        finishLoadingFonts = resolve;
      }),
    );

    const view = await render(<RootLayout />);

    expect(view.queryByTestId('root-stack')).toBeNull();
    expect(mockLoadAsync).toHaveBeenCalledTimes(1);
    const fontMap = mockLoadAsync.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(fontMap)).toEqual(
      expect.arrayContaining(['BricolageGrotesque_800ExtraBold', 'IBMPlexMono_500Medium']),
    );
    expect(mockHideAsync).not.toHaveBeenCalled();

    await act(async () => {
      finishLoadingFonts();
    });

    expect(view.getByTestId('root-stack')).toBeTruthy();
    expect(mockHideAsync).toHaveBeenCalledTimes(1);
  });

  it('registers the sheet and modal routes', async () => {
    mockLoadAsync.mockResolvedValue(undefined);

    const view = await render(<RootLayout />);
    await act(async () => undefined);

    for (const route of ['index', 'compose', 'cast/[id]', 'join/[id]', 'you', 'caster/[id]', 'recap']) {
      expect(view.getByText(route)).toBeTruthy();
    }
  });
});
