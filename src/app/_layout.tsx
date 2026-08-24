import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { tokens } from '@/design-system/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: tokens.semantic.color.backgroundCanvas },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: tokens.semantic.color.backgroundCanvas },
        headerTitleStyle: { fontFamily: 'Manrope_700Bold' },
        headerTintColor: tokens.semantic.color.textPrimary,
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="create" options={{ title: 'New intent', presentation: 'modal' }} />
      <Stack.Screen name="preview" options={{ title: 'Review intent' }} />
    </Stack>
  );
}
