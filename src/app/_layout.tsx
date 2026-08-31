import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { loadAsync } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { tokens } from '@/design-system/tokens';
import {
  SessionProvider,
  useMembershipRedirect,
} from '@/features/auth/ui/session-provider';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function prepareAppShell() {
      try {
        await loadAsync({
          Manrope_400Regular,
          Manrope_600SemiBold,
          Manrope_700Bold,
        });
      } finally {
        if (isMounted) {
          setFontsReady(true);
          await SplashScreen.hideAsync();
        }
      }
    }

    void prepareAppShell();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!fontsReady) return null;

  return (
    <KeyboardProvider>
      <SessionProvider>
        <AppStack />
      </SessionProvider>
    </KeyboardProvider>
  );
}

/**
 * Split from RootLayout so the redirect hook runs inside SessionProvider.
 */
function AppStack() {
  useMembershipRedirect();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: tokens.semantic.color.backgroundCanvas },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: tokens.semantic.color.backgroundCanvas },
        headerTitleStyle: { fontFamily: 'Manrope_700Bold' },
        headerTintColor: tokens.semantic.color.textPrimary,
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="create" options={{ title: 'New intent', presentation: 'modal' }} />
      <Stack.Screen name="preview" options={{ title: 'Review intent' }} />
      <Stack.Screen name="intent/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="request/[id]" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="room/[id]" options={{ title: 'Coordination room' }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="invite/[token]" options={{ headerShown: false }} />
      <Stack.Screen name="i/[shareSlug]" options={{ headerShown: false }} />
    </Stack>
  );
}
