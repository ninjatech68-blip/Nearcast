import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarButton } from '@/design-system/components/button';
import { fontFamily, tokens } from '@/design-system/tokens';
import { completeAuthFromUrl, exchangeAuthCode } from '@/features/auth/auth';

/**
 * The magic-link landing screen. The email link opens the app at
 * nearcast://auth/callback?code=… — expo-router routes here, so instead
 * of an "unmatched route" the person lands on a real screen that
 * completes the PKCE exchange and moves on. The shell gate then routes a
 * brand-new account to onboarding and a returning one to the feed.
 *
 * Both cold start (opened by the link) and warm start (already running)
 * arrive here with the code as a query param; a cold-start fallback
 * reads the launch URL directly in case the param did not survive.
 */
export default function AuthCallbackScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    void (async () => {
      if (params.error || params.error_description) {
        setError('that sign-in link didn’t work. ask for a new one.');
        return;
      }

      const code = Array.isArray(params.code) ? params.code[0] : params.code;
      const result = code
        ? await exchangeAuthCode(code)
        : await completeAuthFromUrl((await Linking.getInitialURL()) ?? '');

      if (!result.ok) {
        setError(result.message);
        return;
      }
      // signed in: the shell gate sends a new account to onboarding; an
      // existing one stays on the feed.
      router.replace('/');
    })();
    // params are read once, on the mount that owns this callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <Text style={styles.wordmark}>NEARCAST</Text>
      <View style={styles.middle}>
        {error ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>sign-in link</Text>
            <Text style={styles.note}>{error}</Text>
          </>
        ) : (
          <>
            <ActivityIndicator color={tokens.semantic.color.accent} />
            <Text style={styles.note}>signing you in…</Text>
          </>
        )}
      </View>
      {error ? (
        <BarButton label="back to sign in" variant="onOrange" onPress={() => router.replace('/signin')} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.cream, paddingHorizontal: 28 },
  wordmark: { ...tokens.typography.tag, color: tokens.semantic.color.textMutedOnCream },
  middle: { flex: 1, justifyContent: 'center', gap: 12 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    letterSpacing: -0.6,
    color: tokens.semantic.color.ink,
  },
  note: { ...tokens.typography.body, color: tokens.semantic.color.textMutedOnCream },
});
