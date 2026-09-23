import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { loadAsync } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { tokens } from '@/design-system/legacy-tokens';
import { ThemeProvider } from '@/design-system/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // UI text uses the platform font, so nothing waits for Manrope (06 §4).
    // Display text falls back to the system font until it arrives.
    loadAsync({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold }).catch(() => undefined);
    void SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider>
      {/* The pre-TrueGoing screens are light-only; dark status bar until T14 replaces them. */}
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: tokens.semantic.color.backgroundCanvas },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: tokens.semantic.color.backgroundCanvas },
          headerTintColor: tokens.semantic.color.textPrimary,
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create" options={{ title: 'New intent', presentation: 'modal' }} />
        <Stack.Screen name="preview" options={{ title: 'Review intent' }} />
        <Stack.Screen name="intent/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="request/[id]" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="design-system" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
