import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { fontFamily, tokens, type Verb } from '@/design-system/tokens';

/** the avatar dot: profile lives behind it. */
export function AvatarDot({ onColored = false, verb }: { onColored?: boolean; verb?: Verb }) {
  const initialColor =
    onColored && verb ? (verb === 'need' ? tokens.semantic.color.verbNeed : verb === 'got' ? tokens.semantic.color.verbGot : tokens.semantic.color.accent) : tokens.semantic.color.cream;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="you"
      hitSlop={10}
      onPress={() => router.push('/you')}
      style={styles.dot}
    >
      <Text style={[styles.initials, { color: initialColor }]}>PS</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: tokens.semantic.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: fontFamily.monoSemi, fontSize: 11, letterSpacing: 0.5 },
});
