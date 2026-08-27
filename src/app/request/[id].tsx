import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import {
  NoteInput,
  Section,
  StatusBanner,
  SymbolIcon,
} from '@/features/native-demo/native-ui';

const MAX = 240;

export default function RequestSheetScreen() {
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();

  function submit() {
    if (note.trim().length === 0) {
      setError('Add a short note before sending.');
      return;
    }
    setError(undefined);
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setTimeout(() => router.back(), 900);
    }, 600);
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={() => router.back()} style={styles.scrim} />
        <ScrollView contentContainerStyle={styles.scroll} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
          <View style={styles.grabber} />
          <View style={styles.sheet}>
            <Text accessibilityRole="header" style={styles.title}>Request to join</Text>
            <Text style={styles.body}>Aarav will see your first name and response.</Text>

            <Section>
              <NoteInput
                placeholder="Add a short note"
                value={note}
                onChange={setNote}
                maxLength={MAX}
              />
            </Section>

            <View style={styles.privacyRow}>
              <SymbolIcon color={tokens.semantic.color.actionPrimary} fallback="🔒" name="lock" size={18} />
              <Text style={styles.privacyText}>Exact contact details stay hidden</Text>
            </View>

            {error ? (
              <View style={styles.errorRow}>
                <StatusBanner tone="danger" title={error} icon="exclamationmark.triangle" fallback="!" />
              </View>
            ) : null}

            {sent ? (
              <View style={styles.errorRow}>
                <StatusBanner tone="trust" title="Request sent" body="You’ll get a note here as soon as Aarav responds." icon="checkmark.seal" fallback="✓" />
              </View>
            ) : null}

            <View style={styles.actions}>
              <Button
                label={sent ? 'Sent' : 'Send request'}
                onPress={submit}
                loading={sending}
                disabled={sent}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                onPress={() => router.back()}
                style={styles.cancelTap}
              >
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  keyboard: { flex: 1 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,19,17,0.35)' },
  scroll: { flexGrow: 1, justifyContent: 'flex-end' },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: tokens.semantic.color.borderStrong,
    marginBottom: 8,
  },
  sheet: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: tokens.semantic.color.backgroundSurface,
  },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 22, lineHeight: 28, color: tokens.semantic.color.textPrimary },
  body: { marginTop: 6, fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.textSecondary },

  privacyRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
  },
  privacyText: { flex: 1, fontFamily: 'Manrope_700Bold', fontSize: 13, color: tokens.semantic.color.textSecondary },

  errorRow: { marginTop: 12 },
  actions: { marginTop: 18, gap: 8 },
  cancelTap: { paddingVertical: 8 },
  cancel: { textAlign: 'center', fontFamily: 'Manrope_700Bold', fontSize: 14, color: tokens.semantic.color.textSecondary },
});
