import { StyleSheet, Text, View } from 'react-native';

import { accentFor } from '@/design-system/accents';
import { useAppearance } from '@/design-system/appearance';
import { tokens } from '@/design-system/tokens';

/** The approved privacy copy from DESIGN.md. */
export const PRIVACY_HINT_LINES = [
  'No exact address or contact details shown.',
  'Reach never expands without your action.',
] as const;

type PrivacyHintProps = {
  /** Overrides the approved copy for contexts with a documented alternative. */
  lines?: readonly string[];
};

/** Shown before actions that may reveal information. */
export function PrivacyHint({ lines = PRIVACY_HINT_LINES }: PrivacyHintProps) {
  const accent = accentFor(useAppearance(), 'info');

  return (
    <View
      accessibilityLabel={lines.join(' ')}
      accessibilityRole="text"
      style={[styles.hint, { backgroundColor: accent.background, borderColor: accent.border }]}>
      {lines.map((line) => (
        <Text key={line} style={[styles.line, { color: accent.foreground }]}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    borderRadius: tokens.component.row.radius,
    borderWidth: StyleSheet.hairlineWidth,
    gap: tokens.space[1],
    padding: tokens.component.row.padding,
  },
  line: { ...tokens.type.caption },
});
