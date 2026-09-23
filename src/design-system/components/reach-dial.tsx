import { Pressable, StyleSheet, Text, View } from 'react-native';

import { estimateLabel } from '@/features/plans/domain/counts';
import { REACH_LEVELS, type ReachLevel } from '@/features/plans/domain/enums';
import { reachLabel, reachRank } from '@/features/plans/domain/reach';

import { useTheme } from '../theme';
import { Icon } from './icon';

type Estimate = 'few' | number | null;

type ReachDialProps = {
  value: ReachLevel;
  onChange: (level: ReachLevel) => void;
  city: string;
  /** Server estimates per level; null when unavailable. Never invented on the client. */
  estimates: Record<ReachLevel, Estimate>;
  /** After publishing, levels narrower than this are locked. */
  lockedBelow?: ReachLevel;
};

function spokenEstimate(estimate: Estimate): string {
  if (estimate === null) return 'estimate unavailable';
  const label = estimateLabel(estimate);
  return label ? `${label} people` : 'nobody yet';
}

/** "Who sees it?" (04 S13 step 5, S28). Reach only widens. */
export function ReachDial({ value, onChange, city, estimates, lockedBelow }: ReachDialProps) {
  const { colors, tokens } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      {REACH_LEVELS.map((level) => {
        const locked = lockedBelow !== undefined && reachRank(level) < reachRank(lockedBelow);
        const selected = level === value;
        const label = reachLabel(level, city);
        const estimate = spokenEstimate(estimates[level]);
        return (
          <Pressable
            accessibilityLabel={`${label}, ${estimate}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled: locked }}
            disabled={locked}
            key={level}
            onPress={() => onChange(level)}
            style={[
              styles.option,
              {
                borderRadius: tokens.radius.row,
                borderColor: selected ? colors.actionPrimary : colors.borderSubtle,
                backgroundColor: selected ? colors.backgroundSuccess : colors.backgroundSurface,
              },
              locked && styles.locked,
            ]}>
            <View style={styles.text}>
              <Text style={[tokens.type.bodyStrong, { color: colors.textPrimary }]}>{label}</Text>
              <Text style={[tokens.type.caption, { color: colors.textSecondary }]}>{estimate}</Text>
            </View>
            {locked ? <Icon color="textSecondary" label={null} name="spotLocked" size={16} /> : null}
            {selected ? <Icon color="actionPrimary" label={null} name="confirm" size={18} /> : null}
          </Pressable>
        );
      })}
      <Text style={[tokens.type.caption, { color: colors.textSecondary }]}>
        You can widen who sees it later, never narrow it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1.5, minHeight: 56 },
  text: { flex: 1, gap: 2 },
  locked: { opacity: 0.5 },
});
