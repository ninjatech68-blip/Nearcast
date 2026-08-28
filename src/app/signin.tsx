import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { requiresCode, sendCode, verifyCode, type AuthChannel } from '@/features/auth/auth';

/**
 * Signin: a one-time code, by phone or email. No passwords.
 *
 * Apple and Google buttons are deliberately NOT here. They need
 * expo-apple-authentication and expo-auth-session — native modules
 * that are not in the binary yet — so shipping buttons that cannot
 * work would be worse than not showing them, especially with real
 * testers about to hit this screen. They come back in the same
 * rebuild round as expo-notifications.
 *
 * The screen does not know whether a backend is configured. When one
 * is, sending a code really sends it and the code step appears; when
 * none is, the address signs you straight in. The auth module makes
 * both look the same here.
 */
type Step = 'address' | 'code';

export default function SigninScreen() {
  const insets = useSafeAreaInsets();
  const [channel, setChannel] = useState<AuthChannel>('phone');
  const [step, setStep] = useState<Step>('address');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const address = channel === 'phone' ? phone : email;
  const addressValid =
    channel === 'phone' ? /^\+?\d[\d\s-]{7,}\d$/.test(phone.trim()) : /.+@.+\..+/.test(email.trim());
  const codeValid = /^\d{4,8}$/.test(code.trim());

  async function send() {
    if (!addressValid || busy) return;
    setBusy(true);
    setError(null);
    const result = await sendCode(channel, address);
    setBusy(false);

    if (!result.ok) {
      haptic('warning');
      setError(result.message);
      return;
    }
    haptic('success');
    if (result.needsCode) {
      setStep('code');
      return;
    }
    // local mode signed us in already
    router.replace('/onboarding');
  }

  async function verify() {
    if (!codeValid || busy) return;
    setBusy(true);
    setError(null);
    const result = await verifyCode(channel, address, code);
    setBusy(false);

    if (!result.ok) {
      haptic('warning');
      setError(result.message);
      return;
    }
    haptic('success');
    router.replace('/onboarding');
  }

  function switchChannel(next: AuthChannel) {
    haptic('selection');
    setChannel(next);
    setError(null);
    setCode('');
    setStep('address');
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Text style={styles.wordmark}>NEARCAST</Text>

        <View style={styles.middle}>
          <Text accessibilityRole="header" style={styles.title}>a place to post a plan.</Text>
          <Text style={styles.sub}>and let people you already trust — or one link away — say they&apos;re in.</Text>
        </View>

        {step === 'address' ? (
          <View style={styles.form}>
            <View style={styles.tabs}>
              <Tab label="phone" on={channel === 'phone'} onPress={() => switchChannel('phone')} />
              <Tab label="email" on={channel === 'email'} onPress={() => switchChannel('email')} />
            </View>

            {channel === 'phone' ? (
              <TextInput
                accessibilityLabel="phone number"
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={tokens.semantic.color.hairlineOnCream}
                selectionColor={tokens.semantic.color.accent}
                style={styles.input}
                keyboardType="phone-pad"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={send}
              />
            ) : (
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
            )}

            <Text style={styles.note}>
              {requiresCode()
                ? channel === 'phone'
                  ? 'we send a 6-digit code by sms. no password, nothing to remember.'
                  : 'we send a 6-digit code by email. no password, nothing to remember.'
                : 'no backend configured — this signs you straight in on fixture data.'}
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <BarButton
              label={requiresCode() ? 'send code' : 'continue'}
              variant="onOrange"
              onPress={send}
              disabled={!addressValid || busy}
              loading={busy}
              loadingLabel="sending…"
            />
            <LegalRow />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>CODE SENT TO {address.trim().toUpperCase()}</Text>
            <TextInput
              accessibilityLabel="verification code"
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor={tokens.semantic.color.hairlineOnCream}
              selectionColor={tokens.semantic.color.accent}
              style={styles.input}
              keyboardType="number-pad"
              autoCorrect={false}
              autoFocus
              textContentType="oneTimeCode"
              returnKeyType="go"
              onSubmitEditing={verify}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <BarButton
              label="verify"
              variant="onOrange"
              onPress={verify}
              disabled={!codeValid || busy}
              loading={busy}
              loadingLabel="checking…"
            />
            <QuietAction
              label="use a different number or address"
              color={tokens.semantic.color.ink}
              onPress={() => {
                setCode('');
                setError(null);
                setStep('address');
              }}
            />
            <LegalRow />
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function Tab({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.tab, on && styles.tabOn]}
    >
      <Text style={[styles.tabText, on && styles.tabTextOn]}>{label}</Text>
    </Pressable>
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
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  tab: {
    minHeight: 38,
    paddingHorizontal: 18,
    borderRadius: tokens.primitive.radius.pill,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    justifyContent: 'center',
  },
  tabOn: { backgroundColor: tokens.semantic.color.ink, borderColor: tokens.semantic.color.ink },
  tabText: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  tabTextOn: { color: tokens.semantic.color.cream },
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
  error: { ...tokens.typography.metaSmall, color: tokens.semantic.color.accent },
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 },
  legalLink: { fontFamily: fontFamily.displaySemi, fontSize: 13, color: tokens.semantic.color.textMutedOnCream, textDecorationLine: 'underline' },
  legalDot: { color: tokens.semantic.color.hairlineOnCream },
});
