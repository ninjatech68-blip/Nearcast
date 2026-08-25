import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { devSignInAvailable, signInWithDevPassword } from '@/features/auth/dev-sign-in';
import { signInWithProvider, type AuthProvider } from '@/features/auth/sign-in';

export default function SignInScreen() {
  const [pending, setPending] = useState<AuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devEmail, setDevEmail] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [devPending, setDevPending] = useState(false);
  const showDevSignIn = devSignInAvailable();

  async function startSignIn(provider: AuthProvider) {
    setPending(provider);
    setError(null);
    const result = await signInWithProvider(provider);
    setPending(null);
    // An empty message means the user cancelled, which is not an error state.
    if (!result.ok && result.message) setError(result.message);
  }

  async function startDevSignIn() {
    setDevPending(true);
    setError(null);
    const result = await signInWithDevPassword(devEmail, devPassword);
    setDevPending(false);
    if (!result.ok) setError(result.message);
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

        {showDevSignIn ? (
          <View style={styles.devSection} testID="dev-sign-in">
            <Text style={styles.devTitle}>Development sign-in</Text>
            <Text style={styles.devBody}>
              Local testing only. Uses the seeded personas in supabase/seed.sql and is never
              available in production.
            </Text>
            <TextInput
              accessibilityLabel="Development email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setDevEmail}
              placeholder="persona@nearcast.local"
              placeholderTextColor={tokens.semantic.color.textMuted}
              style={styles.devInput}
              value={devEmail}
            />
            <TextInput
              accessibilityLabel="Development password"
              autoCapitalize="none"
              onChangeText={setDevPassword}
              placeholder="Password"
              placeholderTextColor={tokens.semantic.color.textMuted}
              secureTextEntry
              style={styles.devInput}
              value={devPassword}
            />
            <Button
              disabled={devEmail.trim().length === 0 || devPassword.length === 0}
              label="Sign in as local persona"
              loading={devPending}
              onPress={() => void startDevSignIn()}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundApp },
  content: { padding: 20, gap: 16 },
  title: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_700Bold',
    fontSize: 28,
    lineHeight: 34,
  },
  body: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  actions: { gap: 12, marginTop: 8 },
  error: {
    color: tokens.semantic.color.statusDanger,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  footnote: {
    marginTop: 8,
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  devSection: {
    marginTop: 24,
    padding: 16,
    gap: 10,
    borderRadius: tokens.primitive.radius.card,
    borderWidth: 1,
    borderColor: tokens.semantic.color.statusWarning,
    backgroundColor: tokens.semantic.color.backgroundWarning,
  },
  devTitle: {
    color: tokens.semantic.color.statusWarning,
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
  },
  devBody: {
    color: tokens.semantic.color.statusWarning,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  devInput: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: tokens.component.input.radius,
    borderWidth: 1,
    borderColor: tokens.semantic.color.borderSubtle,
    backgroundColor: tokens.semantic.color.backgroundSurface,
    fontFamily: 'Manrope_400Regular',
    fontSize: 16,
    color: tokens.semantic.color.textPrimary,
  },
});
