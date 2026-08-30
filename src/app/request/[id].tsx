import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { newRequestKey } from '@/features/intents/data/request-key';
import { submitResponse } from '@/features/responses/data/responses-repository';
import {
  QUALIFICATION_KEYS,
  QUALIFICATION_LABELS,
  RESPONSE_MESSAGE_MAX_LENGTH,
  canSubmitResponse,
  describeResponseDisclosure,
  emptyResponseDraft,
  findResponseProblems,
  type QualificationKey,
} from '@/features/responses/domain/response-draft';

/**
 * The response sheet.
 *
 * One CTA, per the screen contract, and no view of anyone else's reply: a
 * respondent never learns who else answered or how many did. The disclosure
 * block states what the broadcaster will receive before it is sent.
 */
export default function ResponseSheetScreen() {
  const { id, firstName } = useLocalSearchParams<{ id: string; firstName?: string }>();
  const [draft, setDraft] = useState(emptyResponseDraft());
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problems = findResponseProblems(draft);
  const disclosure = describeResponseDisclosure(draft, firstName ?? 'Your first name');

  function toggle(key: QualificationKey) {
    setDraft((current) => ({
      ...current,
      qualification: {
        ...current.qualification,
        [key]: current.qualification[key] !== true,
      },
    }));
  }

  async function send() {
    if (!canSubmitResponse(draft)) return;

    setIsSending(true);
    setError(null);

    try {
      await submitResponse({ intentId: id, draft, requestKey: newRequestKey() });
      router.back();
    } catch {
      setError(
        'We could not send that. This intent may have closed, or you may not be able to respond to it.',
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>
            Respond
          </Text>

          <TextInput
            accessibilityLabel="Your note"
            maxLength={RESPONSE_MESSAGE_MAX_LENGTH}
            multiline
            onChangeText={(message) => setDraft((current) => ({ ...current, message }))}
            placeholder="Say how you can help"
            placeholderTextColor={tokens.semantic.color.textMuted}
            style={styles.input}
            value={draft.message}
          />

          <Text style={styles.sectionLabel}>Anything that helps them decide?</Text>
          {QUALIFICATION_KEYS.map((key) => {
            const isSelected = draft.qualification[key] === true;

            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={QUALIFICATION_LABELS[key]}
                accessibilityState={{ checked: isSelected }}
                key={key}
                onPress={() => toggle(key)}
                style={[styles.option, isSelected && styles.optionSelected]}>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {QUALIFICATION_LABELS[key]}
                </Text>
              </Pressable>
            );
          })}

          <View accessibilityLabel="What they will see" style={styles.disclosure}>
            <Text style={styles.disclosureTitle}>What they will see</Text>
            {disclosure.shared.map((line) => (
              <Text key={`${line.label}:${line.detail}`} style={styles.disclosureLine}>
                {line.label}: {line.detail}
              </Text>
            ))}

            <Text style={styles.disclosureTitle}>What stays private</Text>
            {disclosure.withheld.map((line) => (
              <Text key={line.label} style={styles.disclosureLine}>
                {line.label}: {line.detail}
              </Text>
            ))}
          </View>

          {error !== null && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}

          {problems.map((problem) => (
            <Text key={problem} style={styles.problem}>
              {problem}
            </Text>
          ))}

          <Button
            disabled={problems.length > 0 || isSending}
            label={isSending ? 'Sending' : 'Send response'}
            onPress={() => void send()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  keyboard: { flex: 1 },
  content: {
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
  input: {
    backgroundColor: tokens.semantic.color.backgroundSurface,
    borderColor: tokens.semantic.color.borderDefault,
    borderRadius: tokens.component.input.radius,
    borderWidth: StyleSheet.hairlineWidth,
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.body.fontSize,
    lineHeight: tokens.typography.body.lineHeight,
    minHeight: 110,
    padding: tokens.primitive.space[4],
    textAlignVertical: 'top',
  },
  sectionLabel: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
  },
  option: {
    backgroundColor: tokens.semantic.color.backgroundSurface,
    borderColor: tokens.semantic.color.borderDefault,
    borderRadius: tokens.primitive.radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: tokens.primitive.space[4],
    paddingVertical: tokens.primitive.space[3],
  },
  optionSelected: {
    backgroundColor: tokens.semantic.color.trustSurface,
    borderColor: tokens.semantic.color.trustText,
  },
  optionText: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.body.fontSize,
  },
  optionTextSelected: { color: tokens.semantic.color.trustText },
  disclosure: {
    backgroundColor: tokens.semantic.color.backgroundSurface,
    borderColor: tokens.semantic.color.borderDefault,
    borderRadius: tokens.primitive.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: tokens.primitive.space[1],
    padding: tokens.primitive.space[4],
  },
  disclosureTitle: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
    marginTop: tokens.primitive.space[2],
  },
  disclosureLine: {
    color: tokens.semantic.color.textSecondary,
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
  problem: {
    color: tokens.semantic.color.warningText,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.caption.fontSize,
  },
});
