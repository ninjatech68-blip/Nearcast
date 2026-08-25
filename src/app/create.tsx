import { type Href, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { IntentPrimitive } from '@/features/intents/domain/intent';

const primitives: { value: IntentPrimitive; label: string }[] = [
  { value: 'request', label: 'I need' },
  { value: 'offer', label: 'I can offer' },
  { value: 'plan', label: "I'm planning" },
];

export default function CreateIntentScreen() {
  const [primitive, setPrimitive] = useState<IntentPrimitive>('request');
  const [statement, setStatement] = useState('');
  const trimmed = statement.trim();

  function reviewDraft() {
    router.push({ pathname: '/preview', params: { primitive, statement: trimmed } } as unknown as Href);
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>WHAT IS YOUR INTENT?</Text>
        <View style={styles.chips}>
          {primitives.map((item) => {
            const selected = primitive === item.value;
            return (
              <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setPrimitive(item.value)} style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          accessibilityLabel="Intent statement"
          autoFocus
          multiline
          maxLength={500}
          onChangeText={setStatement}
          placeholder="For example: Looking for two people to help sort donated books tomorrow morning."
          placeholderTextColor={tokens.semantic.color.textMuted}
          style={styles.composer}
          textAlignVertical="top"
          value={statement}
        />
        <Text style={styles.counter}>{statement.length}/500</Text>
        <View style={styles.privacyNote}>
          <Text style={styles.privacyTitle}>Starts private</Text>
          <Text style={styles.privacyBody}>This is only a draft. You will review reach, expiry, and what others can see before publishing.</Text>
        </View>
      </View>
      <View style={styles.footer}><Button label="Review intent" onPress={reviewDraft} disabled={trimmed.length === 0} /></View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { flex: 1, padding: 20 },
  eyebrow: { fontFamily: 'Manrope_700Bold', fontSize: 12, letterSpacing: 1.2, color: tokens.semantic.color.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { minHeight: 48, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.semantic.color.backgroundSurface },
  chipSelected: { borderColor: tokens.semantic.color.actionPrimary, backgroundColor: tokens.semantic.color.trustSurface },
  chipText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: tokens.semantic.color.textSecondary },
  chipTextSelected: { color: tokens.semantic.color.trustText },
  composer: { minHeight: 180, marginTop: 24, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, backgroundColor: tokens.semantic.color.backgroundSurface, fontFamily: 'Manrope_400Regular', fontSize: 18, lineHeight: 27, color: tokens.semantic.color.textPrimary },
  counter: { marginTop: 6, textAlign: 'right', fontFamily: 'Manrope_400Regular', fontSize: 12, color: tokens.semantic.color.textMuted },
  privacyNote: { marginTop: 24, padding: 16, borderRadius: 16, backgroundColor: tokens.semantic.color.infoSurface },
  privacyTitle: { fontFamily: 'Manrope_600SemiBold', color: tokens.semantic.color.infoText },
  privacyBody: { marginTop: 4, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.infoText },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: tokens.semantic.color.borderDefault },
});
