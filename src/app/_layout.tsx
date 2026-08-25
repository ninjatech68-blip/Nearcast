import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useColors } from '@/design-system/appearance';
import { tokens } from '@/design-system/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const color = useColors();

  // Typography is native (SF Pro / Roboto per DESIGN.md), so there are no
  // fonts to load; the splash screen hides as soon as the shell mounts.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: color.background.app },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: color.background.app },
        headerTitleStyle: { fontWeight: tokens.type.bodyStrong.fontWeight },
        headerTintColor: color.text.primary,
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="create" options={{ title: 'New intent', presentation: 'modal' }} />
      <Stack.Screen name="preview" options={{ title: 'Review intent' }} />
      <Stack.Screen name="intent/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="request/[id]" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}
