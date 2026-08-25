import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';

const mockLoadAsync = jest.fn<(fontMap: unknown) => Promise<void>>();
const mockHideAsync = jest.fn<() => Promise<void>>();
const mockPreventAutoHideAsync = jest.fn<() => Promise<void>>();

jest.mock('expo-font', () => ({
  loadAsync: (fontMap: unknown) => mockLoadAsync(fontMap),
}));

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

  return { Stack };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RootLayout = require('./app/_layout').default;

describe('RootLayout', () => {
  beforeEach(() => {
    mockLoadAsync.mockReset();
    mockHideAsync.mockReset();
    mockPreventAutoHideAsync.mockReset();
  });

  it('loads fonts from an effect before showing the app shell', async () => {
    let finishLoadingFonts: () => void = () => undefined;
    mockLoadAsync.mockReturnValue(new Promise<void>((resolve) => {
      finishLoadingFonts = resolve;
    }));

    const view = await render(<RootLayout />);

    expect(view.queryByTestId('root-stack')).toBeNull();
    expect(mockLoadAsync).toHaveBeenCalledTimes(1);
    expect(mockHideAsync).not.toHaveBeenCalled();

    await act(async () => {
      finishLoadingFonts();
    });

    expect(view.getByTestId('root-stack')).toBeTruthy();
    expect(mockHideAsync).toHaveBeenCalledTimes(1);
  });
});
