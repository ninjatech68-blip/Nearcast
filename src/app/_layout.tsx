import { BricolageGrotesque_400Regular } from '@expo-google-fonts/bricolage-grotesque/400Regular';
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';
import { loadAsync } from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { tokens } from '@/design-system/tokens';
import { useMe } from '@/features/me/me-store';
import { flushWrites } from '@/infrastructure/persistence/storage';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsReady, setFontsReady] = useState(false);
  const me = useMe();
  const segments = useSegments();

  useEffect(() => {
    let isMounted = true;

    async function prepareAppShell() {
      try {
        await loadAsync({
          BricolageGrotesque_400Regular,
          BricolageGrotesque_600SemiBold,
          BricolageGrotesque_800ExtraBold,
          IBMPlexMono_400Regular,
          IBMPlexMono_500Medium,
          IBMPlexMono_600SemiBold,
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

  // persisted writes are debounced, so a change made in the last
  // ~120ms before a force-quit would be lost. flush when the app
  // leaves the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') flushWrites();
    });
    return () => sub.remove();
  }, []);

  // gate the shell on signed-in + onboarding-done, but only after
  // fonts are ready so we don't route through a partially-mounted
  // app. legal pages (terms / privacy / guidelines) stay reachable
  // when unsigned so the links on the signin screen actually work.
  useEffect(() => {
    if (!fontsReady) return;
    const first = segments[0];
    const inSignin = first === 'signin';
    const inOnboarding = first === 'onboarding';
    const inLegal = first === 'legal';
    if (!me.signedIn && !inSignin && !inLegal) {
      router.replace('/signin');
      return;
    }
    if (me.signedIn && !me.onboardingDone && !inOnboarding && !inLegal) {
      router.replace('/onboarding');
    }
  }, [fontsReady, me.signedIn, me.onboardingDone, segments]);

  if (!fontsReady) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.semantic.color.cream },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="compose" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="cast/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="join/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="you" options={{ presentation: 'modal' }} />
      <Stack.Screen name="caster/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="filter" options={{ presentation: 'modal' }} />
      <Stack.Screen name="area" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="circles" options={{ presentation: 'modal' }} />
      <Stack.Screen name="chat/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="recap" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="reflect/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="invite/[key]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="vouch/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="signin" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="areas" options={{ presentation: 'modal' }} />
      <Stack.Screen name="blocked" options={{ presentation: 'modal' }} />
      <Stack.Screen name="receipts" options={{ presentation: 'modal' }} />
      <Stack.Screen name="delete-account" options={{ presentation: 'modal' }} />
      <Stack.Screen name="report/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="legal/terms" options={{ presentation: 'modal' }} />
      <Stack.Screen name="legal/privacy" options={{ presentation: 'modal' }} />
      <Stack.Screen name="legal/guidelines" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
