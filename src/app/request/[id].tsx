import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { submitResponse } from '@/features/intents/data/activity-queries';

/**
 * A respondent must see exactly what the broadcaster will receive before
 * sending. Nothing beyond this list is shared by responding.
 */
export default function RequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => globalThis.crypto.randomUUID());

  const trimmed = message.trim();

  async function send() {
    setSending(true);
    setError(null);
    const result = await submitResponse(id ?? '', trimmed, {}, idempotencyKey);
    setSending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.back();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>
            Send a response
          </Text>

          <TextInput
            accessibilityLabel="Response message"
            autoFocus
            maxLength={1000}
            multiline
            onChangeText={setMessage}
            placeholder="Say briefly why you are a good fit."
            placeholderTextColor={tokens.semantic.color.textMuted}
            style={styles.composer}
            textAlignVertical="top"
            value={message}
          />
          <Text style={styles.counter}>{message.length}/1000</Text>

          <View style={styles.disclosure}>
            <Text style={styles.disclosureTitle}>What will be shared</Text>
            <Text style={styles.disclosureBody}>Your display name and approximate area.</Text>
            <Text style={styles.disclosureBody}>Your message and any confirmed interactions.</Text>
            <Text style={styles.disclosureBody}>
              Nothing else. Your contact details stay hidden unless you choose to release them
              after a match.
            </Text>
          </View>

          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            disabled={trimmed.length === 0}
            label="Send response"
            loading={sending}
            onPress={() => void send()}
          />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundApp },
  content: { padding: 20, gap: 10 },
  title: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 20, lineHeight: 26 },
  composer: { minHeight: 140, padding: 16, borderRadius: tokens.primitive.radius.card, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle, backgroundColor: tokens.semantic.color.backgroundSurface, fontFamily: 'Manrope_400Regular', fontSize: 16, lineHeight: 24, color: tokens.semantic.color.textPrimary },
  counter: { textAlign: 'right', color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_400Regular', fontSize: 11 },
  disclosure: { marginTop: 8, padding: 16, borderRadius: tokens.primitive.radius.card, backgroundColor: tokens.semantic.color.backgroundSuccess, gap: 6 },
  disclosureTitle: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 16 },
  disclosureBody: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18 },
  error: { color: tokens.semantic.color.statusDanger, fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: tokens.semantic.color.borderSubtle },
});
