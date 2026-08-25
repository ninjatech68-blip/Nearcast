import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { signInWithProvider, type AuthProvider } from '@/features/auth/sign-in';

export default function SignInScreen() {
  const [pending, setPending] = useState<AuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startSignIn(provider: AuthProvider) {
    setPending(provider);
    setError(null);
    const result = await signInWithProvider(provider);
    setPending(null);
    // An empty message means the user cancelled, which is not an error state.
    if (!result.ok && result.message) setError(result.message);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Sign in to Nearcast
        </Text>
        <Text style={styles.body}>
          Nearcast needs to know who you are so other people can decide whether to respond to you.
          Your originating groups and their members stay private.
        </Text>

        <View style={styles.actions}>
          <Button
            disabled={pending !== null}
            label="Continue with Google"
            loading={pending === 'google'}
            onPress={() => void startSignIn('google')}
          />
          <Button
            disabled={pending !== null}
            label="Continue with Apple"
            loading={pending === 'apple'}
            onPress={() => void startSignIn('apple')}
          />
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Text style={styles.footnote}>
          Nearcast is invitation-only during the alpha. You will need an invitation link after
          signing in.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { padding: 20, gap: 16 },
  title: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_700Bold',
    fontSize: 26,
    lineHeight: 32,
  },
  body: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  actions: { gap: 12, marginTop: 8 },
  error: {
    color: tokens.semantic.color.dangerText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  footnote: {
    marginTop: 8,
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
});
