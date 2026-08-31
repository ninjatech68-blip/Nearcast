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
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import { useMe } from '@/features/me/me-store';
import { useProfileSync } from '@/features/me/use-profile-sync';
import { restoreSession } from '@/features/auth/auth';
import {
  configureNotifications,
  refreshPushRegistration,
  watchPushRegistration,
} from '@/features/notifications/push';
import { useNotificationRouting } from '@/features/notifications/routing';
import { refreshConversations, shellPollInterval, subscribeToActivity } from '@/features/chat/chat';
import { refreshInteractions } from '@/features/casts/store';
import { ReleaseGate } from '@/infrastructure/config/release-gate';
import { usePoll } from '@/infrastructure/net/use-poll';
import { flushWrites } from '@/infrastructure/persistence/storage';

// expo-router renders this instead of a blank white screen when a route
// throws. Exported from the root layout so it covers every segment.
export { ErrorBoundary } from '@/design-system/components/error-boundary';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsReady, setFontsReady] = useState(false);
  const me = useMe();
  const segments = useSegments();

  // mirror this device's profile to the rows delivery reads, whenever
  // they change. no-op without a backend.
  useProfileSync();

  // a tapped push lands on activity with fresh rows; one that arrives
  // while the app is open refreshes what is already on screen.
  useNotificationRouting();

  // live in-app updates: a request or message elsewhere refreshes the
  // dock counts and alerts without waiting for a pull. only while
  // signed in; torn down on sign-out.
  useEffect(() => {
    if (!me.signedIn) return;
    return subscribeToActivity(() => {
      void refreshInteractions();
    });
  }, [me.signedIn]);

  // the floor under realtime for everything OFF the open chat: requests,
  // accepts, and unread counts. polled while signed in and foregrounded
  // so the dock badges, chats and alerts move on their own even if the
  // socket is down. this is also the ONLY fetch of these two at launch:
  // it fires once immediately, so the pages themselves do not repeat it.
  // a little slower than the chat poll — these are less urgent.
  usePoll(
    () => {
      void refreshInteractions();
      void refreshConversations();
    },
    shellPollInterval,
    me.signedIn,
  );

  useEffect(() => {
    let isMounted = true;

    async function prepareAppShell() {
      try {
        await Promise.all([
          loadAsync({
            BricolageGrotesque_400Regular,
            BricolageGrotesque_600SemiBold,
            BricolageGrotesque_800ExtraBold,
            IBMPlexMono_400Regular,
            IBMPlexMono_500Medium,
            IBMPlexMono_600SemiBold,
          }),
          // restore a remote session before the gate below runs, so a
          // signed-in user never flashes the signin screen on launch.
          // no-ops when no backend is configured.
          restoreSession(),
        ]);
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

  // notification presentation is set once at boot; when a signed-in
  // person already granted push, re-register their token (tokens rotate).
  useEffect(() => {
    void configureNotifications();
  }, []);
  useEffect(() => {
    if (me.signedIn) void refreshPushRegistration('signed-in');
  }, [me.signedIn]);
  // Sign-in is not the only moment permission can change. Granting it in
  // iOS Settings — the only route back after declining the prompt, or
  // after a reinstall reset it — produces a resume and nothing else, so
  // without this the phone never registers again.
  useEffect(() => watchPushRegistration(), []);

  // persisted writes are debounced, so a change made in the last
  // ~120ms before a force-quit would be lost. flush when the app
  // leaves the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') flushWrites();
    });
    return () => sub.remove();
  }, []);

  // The magic-link callback is a real screen now: the link opens the app
  // at nearcast://auth/callback?code=…, expo-router routes to
  // app/auth/callback.tsx, and that screen completes the PKCE exchange
  // and moves on. Handling it there (rather than here) means the link
  // lands on a real screen instead of an "unmatched route".

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
    // the area picker is a step WITHIN onboarding (pick home / add a
    // neighbourhood), reached as its own screen. without excusing it,
    // the gate below sees "not in onboarding, not done" and yanks the
    // stack back to /onboarding — which remounts it at the first step.
    const inArea = first === 'area';
    // the magic-link callback runs before the session exists; excusing it
    // keeps the gate from yanking it to /signin mid-exchange.
    const inAuthCallback = first === 'auth';
    if (!me.signedIn && !inSignin && !inLegal && !inAuthCallback) {
      router.replace('/signin');
      return;
    }
    if (me.signedIn && !me.onboardingDone && !inOnboarding && !inLegal && !inArea) {
      router.replace('/onboarding');
    }
  }, [fontsReady, me.signedIn, me.onboardingDone, segments]);

  if (!fontsReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ReleaseGate>
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
      <Stack.Screen name="caster/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="filter" options={{ presentation: 'modal' }} />
      {/* area is opened FROM modals (compose is a fullScreenModal, areas is
          a modal) as well as from the onboarding card. A `card` pushed while
          a modal is on top lands behind that modal on iOS — invisible, yet
          top of the stack, so the caller's own X then pops the hidden area
          instead of closing. Presenting area modally puts it above whatever
          opened it in every case. gestureEnabled:false keeps the X the only
          way out (no pull-to-dismiss onto the wrong screen). */}
      <Stack.Screen name="area" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="circles" options={{ presentation: 'modal' }} />
      <Stack.Screen name="chat/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="recap" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="reflect/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="invite/[key]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="vouch/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="signin" options={{ presentation: 'card', gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="auth/callback" options={{ presentation: 'card', gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="onboarding" options={{ presentation: 'card', gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="areas" options={{ presentation: 'modal' }} />
      <Stack.Screen name="profile-edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="name" options={{ presentation: 'modal' }} />
      <Stack.Screen name="pick-location" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="media-send" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="media-view" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen name="plan/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-cast/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="blocked" options={{ presentation: 'modal' }} />
      <Stack.Screen name="receipts" options={{ presentation: 'modal' }} />
      <Stack.Screen name="delete-account" options={{ presentation: 'modal' }} />
      <Stack.Screen name="report/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="legal/terms" options={{ presentation: 'modal' }} />
      <Stack.Screen name="legal/privacy" options={{ presentation: 'modal' }} />
      <Stack.Screen name="legal/guidelines" options={{ presentation: 'modal' }} />
      </Stack>
      </ReleaseGate>
    </SafeAreaProvider>
  );
}
