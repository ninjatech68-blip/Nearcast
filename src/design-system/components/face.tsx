import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { Glyph } from '@/design-system/components/glyph';
import { fontFamily, tokens } from '@/design-system/tokens';

/**
 * a person's face. photos exist for trust, not performance: in
 * production they are camera-verified selfies captured in-app (no
 * gallery uploads), shown at decision moments. falls back to initials
 * when no photo exists yet.
 *
 * verified = the photo was captured live in-app and passed the
 * liveness check. shows a small orange dot on the face; absent when
 * the person hasn't verified yet (mostly a fixture concern today).
 */
export function Face({
  photo,
  initials,
  size = 44,
  label,
  verified = false,
  badge,
}: {
  photo?: ImageSourcePropType;
  initials: string;
  size?: number;
  label?: string;
  verified?: boolean;
  /**
   * An action badge, which outranks the verified tick when both apply:
   * on your own profile the photo IS the control for changing it, and a
   * tappable avatar with nothing on it is a secret.
   */
  badge?: 'camera';
}) {
  const radius = size / 2;
  const dotSize = badge === 'camera' ? Math.max(Math.round(size * 0.36), 22) : Math.max(Math.round(size * 0.22), 10);

  const inner = photo ? (
    <Image
      accessibilityLabel={label ?? 'profile photo'}
      source={photo}
      style={{ width: size, height: size, borderRadius: radius }}
    />
  ) : (
    <View
      accessibilityLabel={label ?? initials}
      style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}
    >
      <Text style={[styles.initials, size >= 64 && styles.initialsLarge]}>{initials}</Text>
    </View>
  );

  if (!verified && !badge) return inner;

  return (
    <View style={{ width: size, height: size }}>
      {inner}
      <View
        accessibilityLabel={badge === 'camera' ? 'change your photo' : 'verified in-app selfie'}
        style={[
          styles.badge,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            right: -1,
            bottom: -1,
          },
        ]}
      >
        {badge === 'camera' ? (
          <Glyph name="camera" size={Math.round(dotSize * 0.55)} color={tokens.semantic.color.ink} />
        ) : (
          <Text style={[styles.badgeMark, { fontSize: Math.round(dotSize * 0.6) }]}>✓</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: tokens.semantic.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: fontFamily.monoSemi, fontSize: 12, color: tokens.semantic.color.cream },
  initialsLarge: { fontSize: 20 },
  badge: {
    position: 'absolute',
    backgroundColor: tokens.semantic.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: tokens.semantic.color.cream,
  },
  badgeMark: { fontFamily: fontFamily.displaySemi, color: tokens.semantic.color.ink, lineHeight: undefined },
});
