import { StyleSheet, Text, View } from 'react-native';

import { accentFor, type AccentTone } from '@/design-system/accents';
import { useAppearance } from '@/design-system/appearance';
import { tokens } from '@/design-system/tokens';

type PillProps = {
  label: string;
  tone?: AccentTone;
  accessibilityLabel?: string;
};

/**
 * The shared tinted container behind category pills, status pills, and badges.
 * It is deliberately non-interactive; interactive chips wrap it in a Pressable.
 */
export function Pill({ label, tone = 'neutral', accessibilityLabel }: PillProps) {
  const accent = accentFor(useAppearance(), tone);

  return (
    <View
      style={[styles.pill, { backgroundColor: accent.background, borderColor: accent.border }]}>
      <Text accessibilityLabel={accessibilityLabel} style={[styles.label, { color: accent.foreground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...tokens.type.micro },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: tokens.component.pill.radius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: tokens.component.pill.paddingHorizontal,
    paddingVertical: tokens.component.pill.paddingVertical,
  },
});
