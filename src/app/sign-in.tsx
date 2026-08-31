import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import {
  requestSignInCode,
  verifySignInCode,
} from '@/features/auth/data/auth-repository';
import {
  emailSchema,
  otpCodeSchema,
  GENERIC_SIGN_IN_ERROR,
} from '@/features/auth/domain/membership';
import { AreaForm } from '@/features/auth/ui/area-form';
import { InviteForm } from '@/features/auth/ui/invite-form';
import { useSession } from '@/features/auth/ui/session-provider';

type Step = 'email' | 'code';

export default function SignInScreen() {
  const { membership, refresh } = useSession();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const parsedEmail = emailSchema.safeParse(email);
  const parsedCode = otpCodeSchema.safeParse(code);

  async function sendCode() {
    if (!parsedEmail.success) return;

    setIsBusy(true);
    setError(null);

    try {
      await requestSignInCode(parsedEmail.data);
      setStep('code');
    } catch {
      // One message regardless of cause: whether an address is registered is
      // not something a failed attempt should disclose.
      setError(GENERIC_SIGN_IN_ERROR);
    } finally {
      setIsBusy(false);
    }
  }

  async function confirmCode() {
    if (!parsedEmail.success || !parsedCode.success) return;

    setIsBusy(true);
    setError(null);

    try {
      await verifySignInCode(parsedEmail.data, parsedCode.data);
      await refresh();
    } catch {
      setError(GENERIC_SIGN_IN_ERROR);
    } finally {
      setIsBusy(false);
    }
  }

  // Each step is driven by membership rather than local flow state, so someone
  // who closed the app midway returns to exactly the step they left.
  const isAwaitingInvite = membership === 'awaiting_invite';
  const isAwaitingArea = membership === 'awaiting_area';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {isAwaitingArea
            ? 'Choose your area'
            : isAwaitingInvite
              ? 'Redeem your invitation'
              : 'Sign in to Nearcast'}
        </Text>

        {isAwaitingArea ? (
          <AreaForm onChosen={refresh} />
        ) : isAwaitingInvite ? (
          <>
            <Text style={styles.body}>
              You are signed in. Nearcast is invite-only during alpha, so one
              more step.
            </Text>
            <InviteForm onRedeemed={refresh} />
          </>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!isBusy && step === 'email'}
              inputMode="email"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={tokens.semantic.color.textMuted}
              style={styles.input}
              value={email}
            />

            {step === 'code' && (
              <>
                <Text style={styles.label}>Six-digit code</Text>
                <TextInput
                  accessibilityLabel="Six-digit code"
                  editable={!isBusy}
                  inputMode="numeric"
                  maxLength={6}
                  onChangeText={setCode}
                  placeholder="123456"
                  placeholderTextColor={tokens.semantic.color.textMuted}
                  style={styles.input}
                  value={code}
                />
                <Text style={styles.hint}>
                  We sent a code to {parsedEmail.success ? parsedEmail.data : email}.
                </Text>
              </>
            )}

            {error !== null && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}

            {step === 'email' ? (
              <Button
                disabled={!parsedEmail.success || isBusy}
                label={isBusy ? 'Sending' : 'Send code'}
                onPress={() => void sendCode()}
              />
            ) : (
              <Button
                disabled={!parsedCode.success || isBusy}
                label={isBusy ? 'Checking' : 'Confirm code'}
                onPress={() => void confirmCode()}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: {
    gap: tokens.primitive.space[4],
    paddingHorizontal: tokens.primitive.space[5],
    paddingTop: tokens.primitive.space[8],
    paddingBottom: tokens.primitive.space[6],
  },
  title: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_700Bold',
    fontSize: tokens.typography.title1.fontSize,
    lineHeight: tokens.typography.title1.lineHeight,
  },
  body: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.body.fontSize,
    lineHeight: tokens.typography.body.lineHeight,
  },
  form: { gap: tokens.primitive.space[3] },
  label: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
  },
  input: {
    backgroundColor: tokens.semantic.color.backgroundSurface,
    borderColor: tokens.semantic.color.borderDefault,
    borderRadius: tokens.component.input.radius,
    borderWidth: StyleSheet.hairlineWidth,
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.body.fontSize,
    minHeight: tokens.component.input.minHeight,
    paddingHorizontal: tokens.primitive.space[4],
  },
  hint: {
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.caption.fontSize,
  },
  error: {
    color: tokens.semantic.color.dangerText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
  },
});
