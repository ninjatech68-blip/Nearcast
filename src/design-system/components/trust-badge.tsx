import { StyleSheet, Text, View } from 'react-native';

import { accentFor } from '@/design-system/accents';
import { useAppearance } from '@/design-system/appearance';
import { tokens } from '@/design-system/tokens';
import { assertTrustContext } from '@/design-system/trust';

type TrustBadgeProps = {
  /** A factual trust-context line, e.g. `8 of 9 confirmed interactions were completed`. */
  context: string;
  /** Optional verified signal, e.g. `Phone verified. Verification does not guarantee safety.` */
  verifiedSignal?: string;
};

/**
 * Trust context for a broadcaster: evidence relevant to the decision, never a
 * score, band, or guarantee (docs/04, docs/08). It sits on the muted neutral
 * surface — the success tint stays reserved for confirmations.
 */
export function TrustBadge({ context, verifiedSignal }: TrustBadgeProps) {
  const accent = accentFor(useAppearance(), 'neutral');
  const display = assertTrustContext(context);

  return (
    <View
      accessibilityLabel={[display, verifiedSignal].filter(Boolean).join('. ')}
      accessibilityRole="text"
      style={[styles.badge, { backgroundColor: accent.background, borderColor: accent.border }]}>
      <Text style={[styles.display, { color: accent.foreground }]}>{display}</Text>
      {verifiedSignal ? (
        <Text style={[styles.signal, { color: accent.foreground }]}>{verifiedSignal}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: tokens.component.pill.radius,
    borderWidth: StyleSheet.hairlineWidth,
    gap: tokens.component.pill.gap,
    paddingHorizontal: tokens.component.pill.paddingHorizontal,
    paddingVertical: tokens.component.pill.paddingVertical,
  },
  display: { ...tokens.type.micro },
  signal: { ...tokens.type.micro },
});
