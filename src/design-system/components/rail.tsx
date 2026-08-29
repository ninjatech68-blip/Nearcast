import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFamily, tokens } from '@/design-system/tokens';

export type RailPage = 'near' | 'activity';

/**
 * the rail: near · + · activity. mirrors every gesture as a tap,
 * fades while you scroll, returns when you settle. never moves, only fades.
 */
export function Rail({
  current,
  onNear,
  onCast,
  onActivity,
  opacity,
  activityCount = 0,
}: {
  current: RailPage;
  onNear: () => void;
  onCast: () => void;
  onActivity: () => void;
  opacity?: Animated.Value;
  /** things actually waiting on you behind ACTIVITY. 0 shows nothing. */
  activityCount?: number;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.holder, { bottom: insets.bottom + tokens.component.rail.bottomOffset }, opacity ? { opacity } : null]}
    >
      <View style={styles.rail}>
        <Pressable accessibilityRole="button" accessibilityLabel="near" hitSlop={10} onPress={onNear} style={styles.item}>
          <Text style={[styles.label, current === 'near' && styles.on]}>NEAR</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="cast" hitSlop={10} onPress={onCast} style={styles.cast}>
          <Text style={styles.castPlus}>+</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={activityCount > 0 ? `activity, ${activityCount} waiting` : 'activity'}
          hitSlop={10}
          onPress={onActivity}
          style={styles.item}
        >
          <Text style={[styles.label, current === 'activity' && styles.on]}>ACTIVITY</Text>
          {/* a count, not a dot: "something happened" is not as useful
              as "three things happened", and it is a real number — see
              useActivityCount. absent at zero, because a permanent 0
              reads as a failure. */}
          {activityCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activityCount > 9 ? '9+' : activityCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  holder: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  rail: {
    height: tokens.component.rail.height,
    borderRadius: tokens.primitive.radius.pill,
    backgroundColor: tokens.semantic.color.ink,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  item: { minHeight: tokens.component.minTarget, justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 6,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: tokens.semantic.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fontFamily.monoSemi,
    fontSize: 9,
    lineHeight: 12,
    color: tokens.semantic.color.ink,
  },
  label: { ...tokens.typography.tagSmall, color: tokens.primitive.color.cream45, textTransform: 'uppercase' },
  on: { color: tokens.semantic.color.accent },
  cast: {
    width: tokens.component.rail.castSize,
    height: tokens.component.rail.castSize,
    borderRadius: 10,
    backgroundColor: tokens.semantic.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  castPlus: { fontFamily: fontFamily.display, fontSize: 19, lineHeight: 21, color: tokens.semantic.color.ink },
});
