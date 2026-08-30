import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import type { IntentReachLevel } from '@/features/intents/domain/intent';
import {
  REACH_LABELS,
  describeAudienceDelta,
  describePrivacyImpact,
  requiresDisclosureConfirmation,
  selectableLevels,
} from '@/features/reach/domain/reach';

/**
 * `ReachSelector`, per the screen contract: current level, allowed next levels,
 * and the disclosure delta. Expansion is never one tap. Choosing a wider level
 * reveals what it adds and what becomes visible, and the action stays disabled
 * until that has been acknowledged. Narrowing is one tap, always.
 */
export function ReachSelector({
  currentLevel,
  onChange,
  isBusy = false,
}: {
  currentLevel: IntentReachLevel;
  onChange: (target: IntentReachLevel, disclosureConfirmed: boolean) => void;
  isBusy?: boolean;
}) {
  const [target, setTarget] = useState<IntentReachLevel | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const needsConfirmation =
    target !== null && requiresDisclosureConfirmation(currentLevel, target);
  const canApply = target !== null && (!needsConfirmation || confirmed) && !isBusy;

  return (
    <View style={styles.container}>
      <Text accessibilityLabel="Current reach" style={styles.current}>
        Now: {REACH_LABELS[currentLevel]}
      </Text>

      {selectableLevels(currentLevel).map((level) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityLabel={REACH_LABELS[level]}
          accessibilityState={{ selected: target === level }}
          key={level}
          onPress={() => {
            setTarget(level);
            setConfirmed(false);
          }}
          style={[styles.option, target === level && styles.optionSelected]}>
          <Text style={[styles.optionText, target === level && styles.optionTextSelected]}>
            {REACH_LABELS[level]}
          </Text>
        </Pressable>
      ))}

      {target !== null && (
        <View accessibilityLabel="What this changes" style={styles.disclosure}>
          {describeAudienceDelta(currentLevel, target) !== null && (
            <Text style={styles.delta}>{describeAudienceDelta(currentLevel, target)}</Text>
          )}
          <Text style={styles.impact}>{describePrivacyImpact(currentLevel, target)}</Text>
        </View>
      )}

      {needsConfirmation && (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="I understand who this will reach"
          accessibilityState={{ checked: confirmed }}
          onPress={() => setConfirmed((value) => !value)}
          style={[styles.confirm, confirmed && styles.confirmChecked]}>
          <Text style={[styles.confirmText, confirmed && styles.confirmTextChecked]}>
            I understand who this will reach
          </Text>
        </Pressable>
      )}

      {target !== null && (
        <Button
          disabled={!canApply}
          label={isBusy ? 'Updating' : `Change to ${REACH_LABELS[target].toLowerCase()}`}
          onPress={() => onChange(target, confirmed)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: tokens.primitive.space[2] },
  current: {
    color: tokens.semantic.color.textPrimary,
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
    backgroundColor: tokens.semantic.color.infoSurface,
    borderRadius: tokens.primitive.radius.control,
    gap: tokens.primitive.space[1],
    padding: tokens.primitive.space[4],
  },
  delta: {
    color: tokens.semantic.color.infoText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
  },
  impact: {
    color: tokens.semantic.color.infoText,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
  },
  confirm: {
    borderColor: tokens.semantic.color.borderDefault,
    borderRadius: tokens.primitive.radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: tokens.primitive.space[4],
    paddingVertical: tokens.primitive.space[3],
  },
  confirmChecked: {
    backgroundColor: tokens.semantic.color.trustSurface,
    borderColor: tokens.semantic.color.trustText,
  },
  confirmText: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
  },
  confirmTextChecked: { color: tokens.semantic.color.trustText },
});
