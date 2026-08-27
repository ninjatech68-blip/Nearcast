import { BricolageGrotesque_400Regular } from '@expo-google-fonts/bricolage-grotesque/400Regular';
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';
import { loadAsync } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { tokens } from '@/design-system/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsReady, setFontsReady] = useState(false);

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
      <Stack.Screen name="recap" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </>
  );
}
