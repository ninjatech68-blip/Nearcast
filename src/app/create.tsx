import { type Href, router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { IntentPrimitive } from '@/features/intents/domain/intent';

const primitives: { value: IntentPrimitive; label: string }[] = [
  { value: 'request', label: 'I need' },
  { value: 'offer', label: 'I offer' },
  { value: 'plan', label: 'I want to' },
];

export default function CreateIntentScreen() {
  const [primitive, setPrimitive] = useState<IntentPrimitive>('request');
  const [statement, setStatement] = useState('');
  const trimmed = statement.trim();

  function reviewDraft() {
    Keyboard.dismiss();
    router.push({ pathname: '/preview', params: { primitive, statement: trimmed } } as unknown as Href);
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text accessibilityRole="header" style={styles.title}>New cast</Text>

            <Text nativeID="primitive-label" style={styles.fieldLabel}>What kind of cast is this?</Text>
            <View accessibilityLabelledBy="primitive-label" accessibilityRole="radiogroup" style={styles.chips}>
              {primitives.map((item) => {
                const selected = primitive === item.value;
                return (
                  <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setPrimitive(item.value)} style={[styles.chip, selected && styles.chipSelected]}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>What&apos;s the invite?</Text>
            <TextInput
              accessibilityLabel="What's the invite?"
              autoFocus
              multiline
              maxLength={500}
              onChangeText={setStatement}
              placeholder="Chai at 7 near Indiranagar"
              placeholderTextColor={tokens.semantic.color.textMuted}
              style={styles.composer}
              textAlignVertical="top"
              value={statement}
            />
            <Text style={styles.counter}>{statement.length}/500</Text>
            <View style={styles.privacyNote}>
              <Text style={styles.privacyTitle}>You choose who can see this.</Text>
              <Text style={styles.privacyBody}>Contact details stay hidden. You will review reach and expiry before publishing.</Text>
            </View>
          </View>
          <View style={styles.footer}>
            {trimmed.length === 0 ? (
              <Text style={styles.footerHint}>Write a line about your plan to continue.</Text>
            ) : null}
            <Button label="Review cast" onPress={reviewDraft} disabled={trimmed.length === 0} />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, padding: 20 },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 17, lineHeight: 23, textAlign: 'center', color: tokens.semantic.color.textPrimary },
  fieldLabel: { marginTop: 26, marginBottom: 10, fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  chips: { flexDirection: 'row', gap: 0, overflow: 'hidden', borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, borderRadius: 12, backgroundColor: tokens.semantic.color.backgroundSurface },
  chip: { flex: 1, minHeight: 42, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.semantic.color.backgroundSurface },
  chipSelected: { borderColor: tokens.semantic.color.actionPrimary, backgroundColor: tokens.semantic.color.trustSurface },
  chipText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: tokens.semantic.color.textSecondary },
  chipTextSelected: { color: tokens.semantic.color.trustText },
  composer: { minHeight: 180, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, backgroundColor: tokens.semantic.color.backgroundSurface, fontFamily: 'Manrope_400Regular', fontSize: 17, lineHeight: 25, color: tokens.semantic.color.textPrimary },
  counter: { marginTop: 6, textAlign: 'right', fontFamily: 'Manrope_400Regular', fontSize: 12, color: tokens.semantic.color.textMuted },
  privacyNote: { marginTop: 22, padding: 16, borderRadius: 14, backgroundColor: tokens.semantic.color.trustSurface },
  privacyTitle: { fontFamily: 'Manrope_600SemiBold', color: tokens.semantic.color.trustText },
  privacyBody: { marginTop: 4, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.trustText },
  footer: { marginTop: 'auto', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: tokens.semantic.color.borderDefault },
  footerHint: { textAlign: 'center', fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.textSecondary },
});
