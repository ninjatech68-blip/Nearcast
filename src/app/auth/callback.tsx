import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarButton } from '@/design-system/components/button';
import { fontFamily, tokens } from '@/design-system/tokens';
import { completeAuthFromUrl, describeCallbackError, exchangeAuthCode } from '@/features/auth/auth';

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
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
  }>();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    void (async () => {
      // Supabase rejects a bad link at the verify and redirects here
      // with the reason in the URL. Say what it actually was — a link
      // that was already spent is a different problem from one that
      // timed out, and only one of them is fixed by asking again.
      if (params.error || params.error_code || params.error_description) {
        setError(describeCallbackError({
          error: first(params.error),
          error_code: first(params.error_code),
          error_description: first(params.error_description),
        }));
        return;
      }

      const code = first(params.code);
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

/** expo-router hands a repeated query param back as an array. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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
