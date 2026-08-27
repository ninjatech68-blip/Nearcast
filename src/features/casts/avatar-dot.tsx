import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { category as categoryTokens, fontFamily, polesFor, tokens, type Category } from '@/design-system/tokens';

/**
 * the avatar dot: profile lives behind it. on a poster it follows the
 * opposite-pole rule; on cream chrome it defaults to ink with cream text.
 */
export function AvatarDot({ castCategory }: { castCategory?: Category }) {
  const poles = castCategory ? polesFor(castCategory) : null;
  const bg = poles ? poles.pillBg : tokens.semantic.color.ink;
  const fg = castCategory ? categoryTokens[castCategory].field : tokens.semantic.color.cream;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="you"
      hitSlop={10}
      onPress={() => router.push('/you')}
      style={[styles.dot, { backgroundColor: bg }]}
    >
      <Text style={[styles.initials, { color: fg }]}>PS</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: fontFamily.monoSemi, fontSize: 11, letterSpacing: 0.5 },
});
