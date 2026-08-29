import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text } from 'react-native';

import { category as categoryTokens, fontFamily, polesFor, tokens, type Category } from '@/design-system/tokens';
import { initialsFor } from '@/features/me/initials';
import { useMe, useMyPhoto } from '@/features/me/me-store';

/**
 * the avatar dot: profile lives behind it. on a poster it follows the
 * opposite-pole rule; on cream chrome it defaults to ink with cream text.
 *
 * It used to render the literal string "PS", so every tester saw one
 * particular person's initials on their own profile button, on every
 * screen, no matter what name they had given. It now shows the photo
 * they picked, or their own initials, or "?" — never somebody else's.
 */
export function AvatarDot({ castCategory }: { castCategory?: Category }) {
  const me = useMe();
  const photoUri = useMyPhoto();
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
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.photo} accessibilityLabel="your photo" />
      ) : (
        <Text style={[styles.initials, { color: fg }]}>{initialsFor(me.name)}</Text>
      )}
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
    overflow: 'hidden',
  },
  photo: { width: 34, height: 34, borderRadius: 17 },
  initials: { fontFamily: fontFamily.monoSemi, fontSize: 11, letterSpacing: 0.5 },
});
