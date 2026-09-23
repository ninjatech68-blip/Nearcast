import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { Icon } from './icon';

export type PrivacyStripState =
  | { kind: 'locked' }
  | { kind: 'unlocksIn'; label: string }
  | { kind: 'unlocked' }
  | { kind: 'immediate' };

const COPY = {
  locked: 'Exact spot unlocks 1 hour before, for people going.',
  unlocked: 'Exact spot unlocked for people going.',
  immediate: 'This is a venue, so its spot is public.',
} as const;

/** One sentence about what is hidden and when it isn't (06 §8). */
export function PrivacyStrip({ state }: { state: PrivacyStripState }) {
  const { colors, tokens } = useTheme();
  const text = state.kind === 'unlocksIn' ? `Spot unlocks in ${state.label}` : COPY[state.kind];
  const unlocked = state.kind === 'unlocked' || state.kind === 'immediate';
  return (
    <View style={[styles.strip, { backgroundColor: colors.backgroundSurfaceMuted, borderRadius: tokens.radius.row }]}>
      <Icon color="textSecondary" label={null} name={unlocked ? 'spotUnlocked' : 'spotLocked'} size={16} />
      <Text style={[tokens.type.caption, styles.text, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  text: { flex: 1 },
});
