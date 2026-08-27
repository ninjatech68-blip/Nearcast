import { type Href, router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { IntentPrimitive } from '@/features/intents/domain/intent';
import { primitives } from '@/features/native-demo/nearcast-fixtures';
import {
  DetailRow,
  FieldLabel,
  ProgressBar,
  SavedNote,
  Segmented,
  SymbolIcon,
  TextArea,
  TopBar,
} from '@/features/native-demo/native-ui';

export default function CreateIntentScreen() {
  const [primitive, setPrimitive] = useState<IntentPrimitive>('plan');
  const [statement, setStatement] = useState('');
  const [area, setArea] = useState<string | undefined>();
  const [time, setTime] = useState<string | undefined>();

  const trimmed = statement.trim();
  const canProceed = trimmed.length > 0;

  function reviewDraft() {
    if (!canProceed) return;
    Keyboard.dismiss();
    router.push({
      pathname: '/preview',
      params: { primitive, statement: trimmed, area: area ?? '', time: time ?? '' },
    } as unknown as Href);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar
          title="New intent"
          onBack={() => router.back()}
          rightAction={
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={styles.iconTap}>
              <SymbolIcon color={tokens.semantic.color.textPrimary} fallback="×" name="xmark" size={22} />
            </Pressable>
          }
        />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <ProgressBar steps={2} currentStep={1} />

          <Text accessibilityRole="header" style={styles.question}>
            What do you need, offer, or want to do?
          </Text>

          <Segmented<IntentPrimitive>
            label="Intent primitive"
            value={primitive}
            onChange={setPrimitive}
            options={primitives.map((p) => ({ value: p.value as IntentPrimitive, label: p.label }))}
          />

          <FieldLabel>Your intent</FieldLabel>
          <TextArea
            accessibilityLabel="Intent statement"
            value={statement}
            onChange={setStatement}
            placeholder="Share a clear and specific intent."
            maxLength={280}
          />

          <View style={styles.detailBlock}>
            <DetailRow
              icon="mappin.and.ellipse"
              fallback="📍"
              label={area ?? 'Add approximate area'}
              value={area ? undefined : undefined}
              onPress={() => setArea('Indiranagar area')}
            />
            <DetailRow
              icon="clock"
              fallback="⏱"
              label={time ?? 'Add time'}
              onPress={() => setTime('Tonight, 8:00 PM')}
            />
          </View>

          <SavedNote label="Draft saved privately" />
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Review intent"
            onPress={reviewDraft}
            disabled={!canProceed}
            trailingIcon={<SymbolIcon color="#FFFFFF" fallback=">" name="chevron.right" size={16} />}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  keyboard: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 24, paddingTop: 6 },
  question: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 26,
    lineHeight: 33,
    letterSpacing: -0.9,
    color: tokens.semantic.color.textPrimary,
    marginBottom: 19,
  },
  detailBlock: { marginTop: 6 },
  footer: {
    padding: 18,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.borderTabs,
    backgroundColor: tokens.semantic.color.backgroundSurface,
  },
  iconTap: { padding: 6 },
});
