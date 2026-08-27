import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarButton } from '@/design-system/components/button';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { setSignedIn } from '@/features/me/me-store';

/**
 * signin. minimal fixture-shape: email + a magic-link prose that
 * actually just flips the store and lands the user in onboarding.
 * production swaps in supabase auth's OTP flow, no shape change.
 */
export default function SigninScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const valid = /.+@.+\..+/.test(email.trim());

  function send() {
    if (!valid) return;
    setState('sending');
    setTimeout(() => {
      haptic('success');
      setSignedIn(email.trim());
      setState('sent');
      // in production, a link would arrive by email; here we
      // continue immediately.
      setTimeout(() => router.replace('/onboarding'), 400);
    }, 500);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Text style={styles.wordmark}>NEARCAST</Text>

        <View style={styles.middle}>
          <Text accessibilityRole="header" style={styles.title}>a place to post a plan.</Text>
          <Text style={styles.sub}>and let people you already trust — or one link away — say they&apos;re in.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>YOUR EMAIL</Text>
          <TextInput
            accessibilityLabel="email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@somewhere.com"
            placeholderTextColor={tokens.semantic.color.hairlineOnCream}
            selectionColor={tokens.semantic.color.accent}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="go"
            onSubmitEditing={send}
          />
          <Text style={styles.note}>we send a link — nothing to remember. no password.</Text>

          <BarButton
            label={state === 'sent' ? 'signed in' : 'send me a link'}
            variant="onOrange"
            onPress={send}
            disabled={!valid || state !== 'idle'}
            loading={state === 'sending'}
          />

          <View style={styles.legalRow}>
            <Pressable accessibilityRole="link" onPress={() => router.push('/legal/terms')} hitSlop={8}>
              <Text style={styles.legalLink}>terms</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/legal/privacy')} hitSlop={8}>
              <Text style={styles.legalLink}>privacy</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/legal/guidelines')} hitSlop={8}>
              <Text style={styles.legalLink}>guidelines</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.cream, paddingHorizontal: 28 },
  flex: { flex: 1 },
  wordmark: { ...tokens.typography.tag, color: tokens.semantic.color.textMutedOnCream },
  middle: { flex: 1, justifyContent: 'center' },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.2,
    color: tokens.semantic.color.ink,
  },
  sub: { ...tokens.typography.body, color: tokens.semantic.color.textMutedOnCream, marginTop: 14 },
  form: { gap: 10, paddingBottom: 12 },
  label: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  input: {
    minHeight: 56,
    borderRadius: tokens.primitive.radius.control,
    borderWidth: 1.5,
    borderColor: tokens.semantic.color.accent,
    paddingHorizontal: 14,
    fontFamily: fontFamily.text,
    fontSize: 18,
    color: tokens.semantic.color.ink,
  },
  note: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream },
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 },
  legalLink: { fontFamily: fontFamily.displaySemi, fontSize: 13, color: tokens.semantic.color.textMutedOnCream, textDecorationLine: 'underline' },
  legalDot: { color: tokens.semantic.color.hairlineOnCream },
});
