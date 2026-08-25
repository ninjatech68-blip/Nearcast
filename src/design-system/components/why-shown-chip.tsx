import { Pressable, StyleSheet, Text } from 'react-native';

import { accentFor } from '@/design-system/accents';
import { useAppearance, useColors } from '@/design-system/appearance';
import { tokens } from '@/design-system/tokens';

const PROMPT = "Why you're seeing this";

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
 * reason. The inline reason is caption-size text, never micro type: the
 * delivery reason is trust-critical copy and must survive font scaling.
 */
export function WhyShownChip({ reason, onPress }: WhyShownChipProps) {
  const accent = accentFor(useAppearance(), 'info');
  const color = useColors();
  const explanation = `Shown because: ${reason}`;

  if (!onPress) {
    return (
      <Text accessibilityRole="text" style={[styles.reason, { color: color.text.secondary }]}>
        {explanation}
      </Text>
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
  reason: { ...tokens.type.caption },
  pressable: { minHeight: tokens.touchTarget.ios },
  pressed: { opacity: 0.88 },
});
