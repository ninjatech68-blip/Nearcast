import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { setName, useMe } from '@/features/me/me-store';

/**
 * Edit your name.
 *
 * Onboarding was the only place a name could ever be set, so a typo
 * there was permanent — and the name is what every other person on a
 * cast sees. Saving writes the local store; `useProfileSync` in the
 * shell notices the change and replaces the server copy, so the name
 * on other people's screens follows without a separate call here.
 *
 * Email is shown but NOT editable. Sign-in is a magic link to that
 * address, so changing it means re-verifying the new one before the
 * old one stops working — a real flow, not a text field. Saying so is
 * better than offering a field that silently locks someone out.
 *
 * The note says only that, and stops. It used to end "write in and
 * we'll move it across", which promised a support channel that does
 * not exist — an offer nobody could act on is worse than the plain
 * "not yet".
 */
export default function ProfileEditScreen() {
  const me = useMe();
  const [name, setLocalName] = useState(me.name);
  const trimmed = name.trim();
  const ready = trimmed.length > 0 && trimmed !== me.name;

  function save() {
    if (!ready) return;
    haptic('success');
    setName(trimmed);
    router.back();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <SheetShell title="your details">
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>NAME</Text>
          <TextInput
            accessibilityLabel="your first name"
            value={name}
            onChangeText={setLocalName}
            placeholder="first name"
            placeholderTextColor={tokens.semantic.color.hairlineOnCream}
            selectionColor={tokens.semantic.color.accent}
            style={styles.input}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            maxLength={40}
            onSubmitEditing={ready ? save : undefined}
          />
          <Text style={styles.hint}>your first name is all anyone else on nearcast sees.</Text>

          <Text style={styles.label}>EMAIL</Text>
          <View style={styles.readonly}>
            <Text style={styles.readonlyText}>{me.email || 'not set'}</Text>
          </View>
          <SheetNote>
            this is where your sign-in link is sent. moving it to another address means verifying that one first,
            so it can&apos;t be changed here yet.
          </SheetNote>
        </ScrollView>
        <View style={styles.actions}>
          <BarButton label="save" variant="onOrange" onPress={save} disabled={!ready} />
          <QuietAction label="never mind" color={tokens.semantic.color.ink} onPress={() => router.back()} />
        </View>
      </SheetShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 20, marginBottom: 8 },
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
  hint: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  readonly: {
    minHeight: 56,
    justifyContent: 'center',
    borderRadius: tokens.primitive.radius.control,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
    paddingHorizontal: 14,
  },
  readonlyText: { fontFamily: fontFamily.text, fontSize: 18, color: tokens.semantic.color.textMutedOnCream },
  actions: { marginTop: 18, gap: 2 },
});
