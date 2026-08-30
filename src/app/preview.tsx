import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import {
  RESPONSE_ACTION_MAX_LENGTH,
  describeDisclosure,
  findDraftProblems,
} from '@/features/intents/create/domain/draft';
import { buildPublishRequest } from '@/features/intents/create/domain/publish-request';
import { PrivacyDisclosure } from '@/features/intents/create/ui/privacy-disclosure';
import { useDraft } from '@/features/intents/create/ui/use-draft';
import { publishIntent } from '@/features/intents/data/publish-intent';
import { newRequestKey } from '@/features/intents/data/request-key';

/**
 * Intent review. Structured context and private details are edited here, then
 * `PrivacyDisclosure` states plainly what publishing would reveal and what it
 * would not. Publishing itself is Task 3.
 */
export default function PreviewIntentScreen() {
  const { draft, update, discard } = useDraft();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const now = new Date();

  async function publish() {
    // One key per publish attempt, reused across retries of that attempt, so a
    // dropped connection resolves to the original intent instead of a second.
    const built = buildPublishRequest(draft, 'origin_only', newRequestKey());

    if (!built.ok) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      const published = await publishIntent(built.request);

      discard();
      router.replace(`/intent/${published.intentId}`);
    } catch {
      setPublishError('We could not publish this intent. Your draft is safe. Try again.');
    } finally {
      setIsPublishing(false);
    }
  }

  const problems = findDraftProblems(draft, now);
  const disclosure = describeDisclosure(draft);
  const { publicDraft, privateDraft } = draft;

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        Review intent
      </Text>

      <Field
        label="What does a helpful reply look like?"
        accessibilityLabel="Response action"
        maxLength={RESPONSE_ACTION_MAX_LENGTH}
        onChangeText={(value) => update({ publicDraft: { responseAction: value } })}
        placeholder="Offer help"
        value={publicDraft.responseAction}
      />

      <Text style={styles.sectionHeading}>Public context</Text>
      <Text style={styles.sectionHint}>
        Everyone who receives this intent can see these.
      </Text>

      <Field
        label="Approximate area"
        accessibilityLabel="Approximate area"
        onChangeText={(value) => update({ publicDraft: { approximatePlace: value } })}
        placeholder="Indiranagar"
        value={publicDraft.approximatePlace ?? ''}
      />

      <Field
        label="How many"
        accessibilityLabel="How many"
        inputMode="numeric"
        onChangeText={(value) =>
          update({
            publicDraft: { quantity: value.trim() === '' ? null : Number(value) },
          })
        }
        placeholder="2"
        value={publicDraft.quantity === null ? '' : String(publicDraft.quantity)}
      />

      <Text style={styles.sectionHeading}>Private details</Text>
      <Text style={styles.sectionHint}>
        These never enter the public intent. You release them to one person after
        you accept them.
      </Text>

      <Field
        label="Exact address"
        accessibilityLabel="Exact address"
        onChangeText={(value) => update({ privateDraft: { exactAddress: value } })}
        placeholder="Only shared after you accept someone"
        value={privateDraft.exactAddress ?? ''}
      />

      <Field
        label="Contact details"
        accessibilityLabel="Contact details"
        onChangeText={(value) => update({ privateDraft: { privateContact: value } })}
        placeholder="Only shared after you accept someone"
        value={privateDraft.privateContact ?? ''}
      />

      <PrivacyDisclosure
        actionLabel="publish"
        heldBack={disclosure.heldBack}
        visibleAfterAction={disclosure.visibleAfterAction}
        visibleNow={disclosure.visibleNow}
      />

      {problems.length > 0 && (
        <View accessibilityLabel="Before you can publish" style={styles.problems}>
          <Text style={styles.problemsTitle}>Before you can publish</Text>
          {problems.map((problem) => (
            <Text key={problem} style={styles.problem}>
              {problem}
            </Text>
          ))}
        </View>
      )}

      {publishError !== null && (
        <Text accessibilityRole="alert" style={styles.publishError}>
          {publishError}
        </Text>
      )}

      <Button
        disabled={problems.length > 0 || isPublishing}
        label={isPublishing ? 'Publishing' : 'Publish intent'}
        onPress={() => void publish()}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Keep editing"
        onPress={() => router.back()}>
        <Text style={styles.secondaryAction}>Keep editing</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  accessibilityLabel,
  ...inputProps
}: {
  label: string;
  accessibilityLabel: string;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        placeholderTextColor={tokens.semantic.color.textMuted}
        style={styles.input}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
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
  sectionHeading: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.title3.fontSize,
    marginTop: tokens.primitive.space[3],
  },
  sectionHint: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
  },
  field: { gap: tokens.primitive.space[1] },
  label: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
  },
  input: {
    backgroundColor: tokens.semantic.color.backgroundSurface,
    borderColor: tokens.semantic.color.borderDefault,
    borderRadius: tokens.component.input.radius,
    borderWidth: StyleSheet.hairlineWidth,
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.body.fontSize,
    minHeight: tokens.component.input.minHeight,
    paddingHorizontal: tokens.primitive.space[4],
  },
  problems: {
    backgroundColor: tokens.semantic.color.warningSurface,
    borderRadius: tokens.primitive.radius.control,
    gap: tokens.primitive.space[1],
    padding: tokens.primitive.space[4],
  },
  problemsTitle: {
    color: tokens.semantic.color.warningText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
  },
  secondaryAction: {
    color: tokens.semantic.color.actionPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
    paddingVertical: tokens.primitive.space[3],
    textAlign: 'center',
  },
  publishError: {
    color: tokens.semantic.color.dangerText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
  },
  problem: {
    color: tokens.semantic.color.warningText,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
  },
});
