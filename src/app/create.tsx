import { router } from 'expo-router';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { STATEMENT_MAX_LENGTH } from '@/features/intents/create/domain/draft';
import { useDraft } from '@/features/intents/create/ui/use-draft';
import { INTENT_PRIMITIVES, type IntentPrimitive } from '@/features/intents/domain/intent';

const primitiveLabels: Record<IntentPrimitive, string> = {
  request: 'I need',
  offer: 'I offer',
  plan: 'I want to',
};

/**
 * The composer. The draft lives on the device and is recovered on entry, so
 * nothing is carried through navigation parameters and nothing reaches the
 * server until publish.
 */
export default function CreateIntentScreen() {
  const { draft, update, discard } = useDraft();
  const { primitive, statement } = draft.publicDraft;

  const remaining = STATEMENT_MAX_LENGTH - statement.trim().length;
  const canReview = primitive !== null && statement.trim().length > 0;

  function reviewDraft() {
    Keyboard.dismiss();
    router.push('/preview');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>
          Broadcast
        </Text>

        <Text style={styles.sectionLabel}>What kind of intent is this?</Text>
        <View style={styles.primitiveRow}>
          {INTENT_PRIMITIVES.map((value) => {
            const isSelected = primitive === value;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={primitiveLabels[value]}
                accessibilityState={{ selected: isSelected }}
                key={value}
                onPress={() => update({ publicDraft: { primitive: value } })}
                style={[styles.primitive, isSelected && styles.primitiveSelected]}>
                <Text
                  style={[
                    styles.primitiveText,
                    isSelected && styles.primitiveTextSelected,
                  ]}>
                  {primitiveLabels[value]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Say it in a sentence</Text>
        <TextInput
          accessibilityLabel="Intent statement"
          maxLength={STATEMENT_MAX_LENGTH}
          multiline
          onChangeText={(value) => update({ publicDraft: { statement: value } })}
          placeholder="Need two helpers for Saturday"
          placeholderTextColor={tokens.semantic.color.textMuted}
          style={styles.input}
          value={statement}
        />
        <Text style={styles.counter}>{remaining} characters left</Text>

        <Text style={styles.hint}>
          This draft stays on your device until you publish it.
        </Text>

        <Button disabled={!canReview} label="Review intent" onPress={reviewDraft} />

        {statement.trim().length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discard draft"
            onPress={discard}>
            <Text style={styles.discard}>Discard draft</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  scrollContent: {
    gap: tokens.primitive.space[3],
    paddingHorizontal: tokens.primitive.space[5],
    paddingTop: tokens.primitive.space[4],
    paddingBottom: tokens.primitive.space[8],
  },
  title: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_700Bold',
    fontSize: tokens.typography.title1.fontSize,
    lineHeight: tokens.typography.title1.lineHeight,
  },
  sectionLabel: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
    marginTop: tokens.primitive.space[2],
  },
  primitiveRow: { flexDirection: 'row', gap: tokens.primitive.space[2] },
  primitive: {
    backgroundColor: tokens.semantic.color.backgroundSurface,
    borderColor: tokens.semantic.color.borderDefault,
    borderRadius: tokens.primitive.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: tokens.primitive.space[4],
    paddingVertical: tokens.primitive.space[2],
  },
  primitiveSelected: {
    backgroundColor: tokens.semantic.color.trustSurface,
    borderColor: tokens.semantic.color.trustText,
  },
  primitiveText: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
  },
  primitiveTextSelected: { color: tokens.semantic.color.trustText },
  input: {
    backgroundColor: tokens.semantic.color.backgroundSurface,
    borderColor: tokens.semantic.color.borderDefault,
    borderRadius: tokens.component.input.radius,
    borderWidth: StyleSheet.hairlineWidth,
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.bodyLarge.fontSize,
    lineHeight: tokens.typography.bodyLarge.lineHeight,
    minHeight: 120,
    padding: tokens.primitive.space[4],
    textAlignVertical: 'top',
  },
  counter: {
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.caption.fontSize,
    textAlign: 'right',
  },
  hint: {
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
  },
  discard: {
    color: tokens.semantic.color.dangerText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
    paddingVertical: tokens.primitive.space[3],
    textAlign: 'center',
  },
});
