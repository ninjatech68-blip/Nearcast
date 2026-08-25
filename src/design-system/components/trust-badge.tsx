import { StyleSheet, Text, View } from 'react-native';

import { accentFor } from '@/design-system/accents';
import { useAppearance } from '@/design-system/appearance';
import { tokens } from '@/design-system/tokens';
import { formatTrustDisplay } from '@/design-system/trust';

type TrustBadgeProps = {
  /** A whole, non-negative trust count. */
  score: number;
  /** A human-readable band such as `High trust`. */
  band: string;
  /** Optional verified signal, for example `ID verified`. */
  verifiedSignal?: string;
};

/**
 * Trust context for a broadcaster, standardised by DESIGN.md as
 * `Trust 812 · High trust`. It is not a popularity badge and must never be
 * read as a guarantee of safety.
 */
export function TrustBadge({ score, band, verifiedSignal }: TrustBadgeProps) {
  const accent = accentFor(useAppearance(), 'success');
  const display = formatTrustDisplay({ score, band });

  return (
    <View
      accessibilityLabel={[`Trust ${score}, ${band.trim()}`, verifiedSignal].filter(Boolean).join('. ')}
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
