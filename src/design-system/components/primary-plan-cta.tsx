import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PlanCta } from '@/features/plans/domain/planCta';

import { useTheme } from '../theme';
import { Button } from './button';

type PrimaryPlanCTAProps = {
  cta: PlanCta;
  onPrimary: () => void;
  onSecondary?: () => void;
  loading?: boolean;
};

/** The sticky footer of a plan card: one verb, driven by `planCta` (04 S11). */
export function PrimaryPlanCTA({ cta, onPrimary, onSecondary, loading = false }: PrimaryPlanCTAProps) {
  const { colors, tokens } = useTheme();

  if (cta.kind === 'closed') {
    return <Text style={[tokens.type.body, styles.closed, { color: colors.textSecondary }]}>{cta.label}</Text>;
  }

  return (
    <View style={styles.wrap}>
      <Button
        disabled={!cta.enabled}
        label={cta.label}
        loading={loading}
        onPress={onPrimary}
        reason={cta.enabled ? undefined : cta.reason}
        variant={cta.kind === 'going' ? 'secondary' : 'primary'}
      />
      {cta.enabled && cta.reason ? (
        <Text style={[tokens.type.caption, styles.note, { color: colors.textSecondary }]}>{cta.reason}</Text>
      ) : null}
      {cta.secondary && onSecondary ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onSecondary} style={styles.secondary}>
          <Text style={[tokens.type.bodyStrong, { color: colors.actionPrimary }]}>{cta.secondary}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  closed: { textAlign: 'center', paddingVertical: 14 },
  note: { textAlign: 'center' },
  secondary: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
});
