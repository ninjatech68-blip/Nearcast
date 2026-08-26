import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { StatePanel } from '@/design-system/components/state-panel';
import { tokens } from '@/design-system/tokens';
import { useSession } from '@/features/auth/session';
import { redeemInvitation } from '@/features/auth/sign-in';

export default function RedeemInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { status, hasProfile, refreshProfile } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [adultAffirmed, setAdultAffirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'loading') {
    return <StatePanel state={{ kind: 'loading' }} />;
  }

  if (status === 'signed-out') {
    return (
      <SafeAreaView style={styles.screen}>
        <StatePanel
          state={{
            kind: 'restricted',
            message: 'Sign in first, then open your invitation link again.',
          }}
        />
        <View style={styles.footer}>
          <Button label="Go to sign in" onPress={() => router.replace('/sign-in')} />
        </View>
      </SafeAreaView>
    );
  }

  if (hasProfile) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatePanel
          state={{
            kind: 'empty',
            title: 'You are already a member',
            body: 'This invitation is not needed for your account.',
          }}
        />
      </SafeAreaView>
    );
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const result = await redeemInvitation(token ?? '', displayName, adultAffirmed);
    if (!result.ok) {
      setSubmitting(false);
      setError(result.message);
      return;
    }
    await refreshProfile();
    setSubmitting(false);
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Join this network
        </Text>
        <Text style={styles.body}>
          Choose the name other people will see on your intents and responses. You can change it
          later.
        </Text>

        <TextInput
          accessibilityLabel="Display name"
          autoFocus
          maxLength={60}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={tokens.semantic.color.textMuted}
          style={styles.input}
          value={displayName}
        />

        <Pressable
          accessibilityLabel="I confirm that I am 18 or over"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: adultAffirmed }}
          onPress={() => setAdultAffirmed((affirmed) => !affirmed)}
          style={styles.affirmRow}
          testID="adult-affirmation">
          <View style={[styles.checkbox, adultAffirmed && styles.checkboxChecked]}>
            {adultAffirmed ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.affirmLabel}>
            I confirm that I am 18 or over. Nearcast is for adults, and accounts for people under
            18 are not permitted.
          </Text>
        </Pressable>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Text style={styles.privacy}>
          Your originating group and its members remain private. Nearcast never reads your group
          conversations.
        </Text>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          disabled={displayName.trim().length === 0 || !adultAffirmed}
          label="Join network"
          loading={submitting}
          onPress={() => void submit()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundApp },
  affirmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 48, paddingVertical: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle, backgroundColor: tokens.semantic.color.backgroundSurface, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { borderColor: tokens.semantic.color.actionPrimary, backgroundColor: tokens.semantic.color.actionPrimary },
  checkmark: { color: tokens.semantic.color.onPrimary, fontFamily: 'Manrope_700Bold', fontSize: 14, lineHeight: 18 },
  affirmLabel: { flex: 1, color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18 },
  content: { padding: 20, gap: 14 },
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
  input: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: tokens.component.input.radius,
    borderWidth: 1,
    borderColor: tokens.semantic.color.borderSubtle,
    backgroundColor: tokens.semantic.color.backgroundSurface,
    fontFamily: 'Manrope_400Regular',
    fontSize: 16,
    color: tokens.semantic.color.textPrimary,
  },
  error: {
    color: tokens.semantic.color.statusDanger,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  privacy: {
    marginTop: 8,
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.borderSubtle,
  },
});
