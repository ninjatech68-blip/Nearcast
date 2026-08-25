import { Pressable, StyleSheet, Text, View } from 'react-native';

import { accentFor } from '@/design-system/accents';
import { useAppearance } from '@/design-system/appearance';
import { tokens } from '@/design-system/tokens';

const PROMPT = 'Why shown';

type WhyShownChipProps = {
  /** The stored, human-readable delivery reason. */
  reason: string;
  /** Opens the full explanation. Without it the reason is rendered inline. */
  onPress?: () => void;
};

/**
 * Required on every delivered or recommended intent.
 *
 * With `onPress` the chip opens the explanation; without it the reason is
 * shown inline, so a recommendation can never be displayed without a reachable
 * reason.
 */
export function WhyShownChip({ reason, onPress }: WhyShownChipProps) {
  const accent = accentFor(useAppearance(), 'info');
  const explanation = `Shown because: ${reason}`;

  if (!onPress) {
    return (
      <View
        style={[styles.chip, { backgroundColor: accent.background, borderColor: accent.border }]}>
        <Text style={[styles.label, { color: accent.foreground }]}>{explanation}</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint={explanation}
      accessibilityLabel={PROMPT}
      accessibilityRole="button"
      hitSlop={tokens.space[2]}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        styles.pressable,
        { backgroundColor: accent.background, borderColor: accent.border },
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.label, { color: accent.foreground }]}>{PROMPT}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: tokens.component.pill.radius,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    paddingHorizontal: tokens.component.pill.paddingHorizontal,
    paddingVertical: tokens.component.pill.paddingVertical,
  },
  label: { ...tokens.type.micro },
  pressable: { minHeight: tokens.touchTarget.ios },
  pressed: { opacity: 0.88 },
});
