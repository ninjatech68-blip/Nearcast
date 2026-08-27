import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { setSignedIn } from '@/features/me/me-store';

/**
 * signin. three ways in — apple, google, phone with OTP — plus a
 * fallback email link. every path lands the same place: signedIn
 * flips and the shell routes into onboarding.
 *
 * production wiring:
 *   - apple: expo-apple-authentication → supabase auth (id_token)
 *   - google: expo-auth-session google provider → supabase auth
 *   - phone: supabase auth signInWithOtp({ phone })
 *   - email: supabase auth signInWithOtp({ email })
 *
 * this fixture stubs all four so the flow shape is real on device.
 */
export default function SigninScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'chooser' | 'phone' | 'email'>('chooser');
  const [phone, setPhone] = useState('+91 ');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const phoneValid = /^\+?\d[\d\s-]{7,}\d$/.test(phone.trim());
  const otpValid = /^\d{4,8}$/.test(otp.trim());
  const emailValid = /.+@.+\..+/.test(email.trim());

  function proceed(id: string) {
    haptic('success');
    setSignedIn(id);
    router.replace('/onboarding');
  }

  function withApple() {
    setBusy(true);
    setTimeout(() => proceed('apple:piyush'), 400);
  }

  function withGoogle() {
    setBusy(true);
    setTimeout(() => proceed('google:piyush'), 400);
  }

  function sendPhoneOtp() {
    if (!phoneValid) return;
    setBusy(true);
    setTimeout(() => {
      haptic('success');
      setOtpSent(true);
      setBusy(false);
    }, 500);
  }

  function verifyPhoneOtp() {
    if (!otpValid) return;
    setBusy(true);
    setTimeout(() => proceed(`phone:${phone.trim()}`), 400);
  }

  function sendEmailLink() {
    if (!emailValid) return;
    setBusy(true);
    setTimeout(() => proceed(email.trim()), 500);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Text style={styles.wordmark}>NEARCAST</Text>

        <View style={styles.middle}>
          <Text accessibilityRole="header" style={styles.title}>a place to post a plan.</Text>
          <Text style={styles.sub}>and let people you already trust — or one link away — say they&apos;re in.</Text>
        </View>

        {mode === 'chooser' ? (
          <View style={styles.form}>
            <BarButton label=" continue with Apple" variant="onInk" onPress={withApple} disabled={busy} loading={busy} />
            <BarButton label="continue with Google" variant="onCream" onPress={withGoogle} disabled={busy} />
            <BarButton label="continue with phone" variant="onCream" onPress={() => setMode('phone')} disabled={busy} />
            <QuietAction label="use email instead" color={tokens.semantic.color.ink} onPress={() => setMode('email')} />
            <LegalRow />
          </View>
        ) : null}

        {mode === 'phone' ? (
          <View style={styles.form}>
            <Text style={styles.label}>YOUR PHONE</Text>
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
              editable={!otpSent}
              returnKeyType="next"
              onSubmitEditing={sendPhoneOtp}
            />

            {otpSent ? (
              <>
                <Text style={styles.note}>we sent a 6-digit code. enter it below.</Text>
                <Text style={styles.label}>CODE</Text>
                <TextInput
                  accessibilityLabel="otp code"
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="123456"
                  placeholderTextColor={tokens.semantic.color.hairlineOnCream}
                  selectionColor={tokens.semantic.color.accent}
                  style={styles.input}
                  keyboardType="number-pad"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="go"
                  onSubmitEditing={verifyPhoneOtp}
                />
                <BarButton label="verify" variant="onOrange" onPress={verifyPhoneOtp} disabled={!otpValid || busy} loading={busy} />
                <QuietAction label="use a different number" color={tokens.semantic.color.ink} onPress={() => { setOtp(''); setOtpSent(false); }} />
              </>
            ) : (
              <>
                <Text style={styles.note}>we send a 6-digit code by sms. no password ever.</Text>
                <BarButton label="send code" variant="onOrange" onPress={sendPhoneOtp} disabled={!phoneValid || busy} loading={busy} />
                <QuietAction label="back" color={tokens.semantic.color.ink} onPress={() => setMode('chooser')} />
              </>
            )}
            <LegalRow />
          </View>
        ) : null}

        {mode === 'email' ? (
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
              onSubmitEditing={sendEmailLink}
            />
            <Text style={styles.note}>we send a link — nothing to remember. no password.</Text>
            <BarButton label="send me a link" variant="onOrange" onPress={sendEmailLink} disabled={!emailValid || busy} loading={busy} />
            <QuietAction label="back" color={tokens.semantic.color.ink} onPress={() => setMode('chooser')} />
            <LegalRow />
          </View>
        ) : null}
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
