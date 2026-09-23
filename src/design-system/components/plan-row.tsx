import { Pressable, StyleSheet, Text, View } from 'react-native';

import { goingLabel } from '@/features/plans/domain/counts';
import { planDistance, type DistanceUnit } from '@/features/plans/domain/distance';
import { relativePlanTime } from '@/features/plans/domain/relativeTime';

import { useTheme } from '../theme';
import { CategoryTile } from './category-tile';
import { GoingStack } from './going-stack';
import { ReasonLine } from './reason-line';

/** The privacy-safe list-row view of a plan (05 §9 `plan_card`). No coordinates, no host address. */
export type PlanRowModel = {
  id: string;
  emoji: string;
  title: string;
  categoryGroup: string | null;
  areaName: string;
  startsAt: Date;
  endsAt: Date;
  distanceMeters: number | null;
  goingCount: number;
  goingPreview: { firstName: string; avatarUrl?: string | null }[];
  reason: string;
};

type PlanRowProps = {
  plan: PlanRowModel;
  now: Date;
  timeZone: string;
  unit: DistanceUnit;
  onPress: (id: string) => void;
  onNotForMe?: (id: string) => void;
};

export function PlanRow({ plan, now, timeZone, unit, onPress, onNotForMe }: PlanRowProps) {
  const { colors, tokens } = useTheme();
  if (!plan.reason.trim()) throw new Error('PlanRow requires a reason');

  const time = relativePlanTime({ startsAt: plan.startsAt, endsAt: plan.endsAt, now, timeZone });
  const place = plan.distanceMeters === null ? plan.areaName : `${plan.areaName} · ${planDistance(plan.distanceMeters, unit)}`;
  const going = goingLabel(plan.goingCount);
  const spoken = [plan.title, plan.areaName, time, going].filter(Boolean).join(', ');

  return (
    <View style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
      <Pressable
        accessibilityLabel={`${spoken}. Why you're seeing this: ${plan.reason}`}
        accessibilityRole="button"
        onPress={() => onPress(plan.id)}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.7 }]}>
        <CategoryTile emoji={plan.emoji} group={plan.categoryGroup} size={tokens.size.tileRow} />
        <View style={styles.body}>
          <View style={styles.titleLine}>
            <Text numberOfLines={1} style={[tokens.type.bodyStrong, styles.title, { color: colors.textPrimary }]}>
              {plan.title}
            </Text>
            <Text style={[tokens.type.caption, { color: time === 'now' ? colors.actionPrimary : colors.textSecondary }]}>{time}</Text>
          </View>
          <View style={styles.metaLine}>
            <Text numberOfLines={1} style={[tokens.type.caption, styles.title, { color: colors.textSecondary }]}>
              {place}
            </Text>
            <GoingStack count={plan.goingCount} people={plan.goingPreview} />
          </View>
        </View>
      </Pressable>
      <View style={styles.reason}>
        <ReasonLine onNotForMe={onNotForMe ? () => onNotForMe(plan.id) : undefined} reason={plan.reason} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  main: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { flex: 1, gap: 4 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1 },
  reason: { paddingLeft: 56 },
});
