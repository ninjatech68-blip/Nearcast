import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { redeemInvite } from '@/features/auth/data/auth-repository';
import {
  describeRedeemOutcome,
  displayNameSchema,
  inviteTokenSchema,
  GENERIC_SIGN_IN_ERROR,
} from '@/features/auth/domain/membership';

/**
 * The final step of joining: exchange an invitation for a profile. Shared by
 * the sign-in flow and the `/invite/[token]` deep link, which only differ in
 * whether the code arrives prefilled.
 */
export function InviteForm({
  initialToken = '',
  onRedeemed,
}: {
  initialToken?: string;
  onRedeemed: () => Promise<void> | void;
}) {
  const [token, setToken] = useState(initialToken);
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const parsedToken = inviteTokenSchema.safeParse(token);
  const parsedName = displayNameSchema.safeParse(displayName);
  const canSubmit = parsedToken.success && parsedName.success && !isBusy;

  async function submit() {
    if (!parsedToken.success || !parsedName.success) return;

    setIsBusy(true);
    setMessage(null);

    try {
      const outcome = await redeemInvite(parsedToken.data, parsedName.data);

      if (outcome === 'redeemed') {
        await onRedeemed();
        return;
      }

      setMessage(describeRedeemOutcome(outcome));
    } catch {
      setMessage(GENERIC_SIGN_IN_ERROR);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.label}>Invitation code</Text>
      <TextInput
        accessibilityLabel="Invitation code"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isBusy}
        onChangeText={setToken}
        placeholder="Paste your invitation code"
        placeholderTextColor={tokens.semantic.color.textMuted}
        style={styles.input}
        value={token}
      />

      <Text style={styles.label}>Your name</Text>
      <TextInput
        accessibilityLabel="Your name"
        editable={!isBusy}
        maxLength={60}
        onChangeText={setDisplayName}
        placeholder="The name others will see"
        placeholderTextColor={tokens.semantic.color.textMuted}
        style={styles.input}
        value={displayName}
      />

      <Text style={styles.hint}>
        Nearcast is invite-only during alpha. Your name is visible to people you
        match with.
      </Text>

      {message !== null && (
        <Text accessibilityRole="alert" style={styles.error}>
          {message}
        </Text>
      )}

      <Button
        disabled={!canSubmit}
        label={isBusy ? 'Joining' : 'Join Nearcast'}
        onPress={() => void submit()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    lineHeight: tokens.typography.caption.lineHeight,
  },
  error: {
    color: tokens.semantic.color.dangerText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
  },
});
