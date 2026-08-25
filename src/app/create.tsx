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
            <Text accessibilityRole="header" style={styles.title}>Broadcast</Text>
            <Text style={styles.prompt}>What do you need, offer, or want to do?</Text>
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
              placeholder="Share a clear and specific intent..."
              placeholderTextColor={tokens.color.light.text.secondary}
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
          <View style={styles.footer}><Button label="Review intent" onPress={reviewDraft} disabled={trimmed.length === 0} /></View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.light.background.app },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, padding: 20 },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 17, lineHeight: 23, textAlign: 'center', color: tokens.color.light.text.primary },
  prompt: { marginTop: 34, fontFamily: 'Manrope_700Bold', fontSize: 24, lineHeight: 30, color: tokens.color.light.text.primary },
  chips: { flexDirection: 'row', gap: 0, marginTop: 18, overflow: 'hidden', borderWidth: 1, borderColor: tokens.color.light.border.subtle, borderRadius: 12, backgroundColor: tokens.color.light.background.surface },
  chip: { flex: 1, minHeight: 42, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.color.light.background.surface },
  chipSelected: { borderColor: tokens.color.light.action.primary, backgroundColor: tokens.color.light.background.success },
  chipText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: tokens.color.light.text.secondary },
  chipTextSelected: { color: tokens.color.light.on.success },
  composer: { minHeight: 180, marginTop: 18, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: tokens.color.light.border.subtle, backgroundColor: tokens.color.light.background.surface, fontFamily: 'Manrope_400Regular', fontSize: 17, lineHeight: 25, color: tokens.color.light.text.primary },
  counter: { marginTop: 6, textAlign: 'right', fontFamily: 'Manrope_400Regular', fontSize: 12, color: tokens.color.light.text.secondary },
  privacyNote: { marginTop: 22, padding: 16, borderRadius: 14, backgroundColor: tokens.color.light.background.success },
  privacyTitle: { fontFamily: 'Manrope_600SemiBold', color: tokens.color.light.on.success },
  privacyBody: { marginTop: 4, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.color.light.on.success },
  footer: { marginTop: 'auto', padding: 20, borderTopWidth: 1, borderTopColor: tokens.color.light.border.subtle },
});
