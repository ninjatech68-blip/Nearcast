import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { loadAsync } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { tokens } from '@/design-system/tokens';
import { SessionProvider } from '@/features/auth/session';

void SplashScreen.preventAutoHideAsync();

// Server state is cached here rather than in component effects, so retries and
// invalidation stay in one place (see docs/05 - System Architecture.md).
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

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
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
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
          <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="request/[id]"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
          <Stack.Screen name="invite/[token]" options={{ title: 'Join network' }} />
          <Stack.Screen name="i/[shareSlug]" options={{ title: 'Intent' }} />
        </Stack>
      </SessionProvider>
    </QueryClientProvider>
  );
}
