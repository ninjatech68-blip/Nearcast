import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { requiresLink, sendMagicLink } from '@/features/auth/auth';

/**
 * Signin: a passwordless email magic link. No passwords, no codes.
 *
 * Enter your email and we send a link; tapping it opens the app and
 * signs you in. There is nothing to copy back. When no backend is
 * configured the same button signs you straight in on fixture data —
 * the screen can't tell the modes apart.
 *
 * Apple / Google buttons are deliberately absent: they need native
 * modules not in the binary yet, and shipping buttons that can't work
 * would be worse than not showing them.
 */
type Step = 'email' | 'sent';
type Mode = 'signup' | 'login';

export default function SigninScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('email');
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /.+@.+\..+/.test(email.trim());
  const link = requiresLink();

  async function sendLink() {
    if (!emailValid || busy) return;
    setBusy(true);
    setError(null);
    // sign up creates the account if it's new; log in only sends a link
    // when an account already exists.
    const result = await sendMagicLink(email, { createUser: mode === 'signup' });
    setBusy(false);

    if (!result.ok) {
      haptic('warning');
      setError(result.message);
      return;
    }
    haptic('success');
    // local mode signs in immediately; remote mode waits for the link
    if (!result.sent) {
      router.replace('/onboarding');
      return;
    }
    setStep('sent');
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 20 }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={insets.top + 20}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollBody, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.wordmark}>NEARCAST</Text>
            <Text accessibilityRole="header" style={styles.title}>
              a place to post a plan.
            </Text>
            <Text style={styles.sub}>
              and let people you already trust — or one link away — say they&apos;re in.
            </Text>
          </View>

          <View style={styles.spacer} />

          {step === 'email' ? (
            <View style={styles.form}>
              {/* login / signup — the same email link either way, but sign
                  up creates an account and log in expects an existing one. */}
              <View style={styles.segment}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="sign up"
                  accessibilityState={{ selected: mode === 'signup' }}
                  onPress={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  style={[styles.segmentTab, mode === 'signup' && styles.segmentTabOn]}
                >
                  <Text style={[styles.segmentText, mode === 'signup' && styles.segmentTextOn]}>sign up</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="log in"
                  accessibilityState={{ selected: mode === 'login' }}
                  onPress={() => {
                    setMode('login');
                    setError(null);
                  }}
                  style={[styles.segmentTab, mode === 'login' && styles.segmentTabOn]}
                >
                  <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextOn]}>log in</Text>
                </Pressable>
              </View>

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
                textContentType="emailAddress"
                returnKeyType="go"
                onSubmitEditing={sendLink}
              />
              <Text style={styles.note}>
                {!link
                  ? 'no backend configured — this signs you straight in on fixture data.'
                  : mode === 'signup'
                    ? 'we email you a link to set up your account — no password, no code to copy.'
                    : 'we email a link to your account — no password, no code to copy.'}
              </Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <BarButton
                label={
                  !link
                    ? mode === 'signup'
                      ? 'create account'
                      : 'log in'
                    : mode === 'signup'
                      ? 'email me a sign-up link'
                      : 'email me a sign-in link'
                }
                variant="onOrange"
                onPress={sendLink}
                disabled={!emailValid || busy}
                loading={busy}
                loadingLabel="sending…"
              />
              <LegalRow />
            </View>
          ) : (
            <View style={styles.form}>
              <Text accessibilityRole="header" style={styles.sentTitle}>check your inbox.</Text>
              <Text style={styles.note}>we sent a sign-in link to</Text>
              <View style={styles.emailChip}>
                <Text style={styles.emailChipText} numberOfLines={1}>
                  {email.trim()}
                </Text>
              </View>
              <Text style={styles.note}>
                tap &ldquo;verify &amp; continue&rdquo; and NearCast opens right back here, signed in.
              </Text>
              <Text style={styles.noteDim}>the link expires shortly and works once. it can take a minute to arrive.</Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <BarButton
                label="resend the link"
                variant="onOrange"
                onPress={sendLink}
                loading={busy}
                loadingLabel="sending…"
              />
              <QuietAction
                label="use a different email"
                color={tokens.semantic.color.ink}
                onPress={() => {
                  setError(null);
                  setStep('email');
                }}
              />
              <LegalRow />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function LegalRow() {
  return (
    <View style={styles.legalRow}>
      <Pressable accessibilityRole="link" onPress={() => router.push('/legal/terms')} hitSlop={10}>
        <Text style={styles.legalLink}>terms</Text>
      </Pressable>
      <Text style={styles.legalDot}>·</Text>
      <Pressable accessibilityRole="link" onPress={() => router.push('/legal/privacy')} hitSlop={10}>
        <Text style={styles.legalLink}>privacy</Text>
      </Pressable>
      <Text style={styles.legalDot}>·</Text>
      <Pressable accessibilityRole="link" onPress={() => router.push('/legal/guidelines')} hitSlop={10}>
        <Text style={styles.legalLink}>guidelines</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.cream, paddingHorizontal: 28 },
  flex: { flex: 1 },
  scrollBody: { flexGrow: 1 },
  header: { marginTop: 24 },
  spacer: { height: 36 },
  wordmark: { ...tokens.typography.tag, color: tokens.semantic.color.textMutedOnCream, marginBottom: 16 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.2,
    color: tokens.semantic.color.ink,
  },
  sub: { ...tokens.typography.body, color: tokens.semantic.color.textMutedOnCream, marginTop: 14 },
  sentTitle: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    letterSpacing: -0.6,
    color: tokens.semantic.color.ink,
    marginBottom: 6,
  },
  form: { gap: 12 },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: tokens.primitive.radius.control,
    backgroundColor: tokens.semantic.color.hairlineOnCream,
    gap: 4,
  },
  segmentTab: {
    flex: 1,
    minHeight: 40,
    borderRadius: tokens.primitive.radius.control - 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTabOn: { backgroundColor: tokens.semantic.color.cream },
  segmentText: { fontFamily: fontFamily.displaySemi, fontSize: 15, color: tokens.semantic.color.textMutedOnCream },
  segmentTextOn: { color: tokens.semantic.color.ink },
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
  note: {
    fontFamily: fontFamily.text,
    fontSize: 14,
    lineHeight: 20,
    color: tokens.semantic.color.textMutedOnCream,
  },
  emailChip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: tokens.primitive.radius.control,
    borderWidth: 1.5,
    borderColor: tokens.semantic.color.accent,
    backgroundColor: tokens.semantic.color.cream,
  },
  emailChipText: { fontFamily: fontFamily.displaySemi, fontSize: 16, color: tokens.semantic.color.ink },
  noteDim: { ...tokens.typography.metaSmall, color: tokens.semantic.color.hairlineOnCream },
  error: { fontFamily: fontFamily.text, fontSize: 14, lineHeight: 20, color: tokens.semantic.color.accent },
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
  legalLink: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 13,
    color: tokens.semantic.color.textMutedOnCream,
    textDecorationLine: 'underline',
  },
  legalDot: { color: tokens.semantic.color.hairlineOnCream },
});
