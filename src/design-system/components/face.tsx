import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { fontFamily, tokens } from '@/design-system/tokens';

/**
 * a person's face. photos exist for trust, not performance: in
 * production they are camera-verified selfies captured in-app (no
 * gallery uploads), shown at decision moments. falls back to initials
 * when no photo exists yet.
 */
export function Face({
  photo,
  initials,
  size = 44,
  label,
}: {
  photo?: ImageSourcePropType;
  initials: string;
  size?: number;
  label?: string;
}) {
  const radius = size / 2;

  if (photo) {
    return (
      <Image
        accessibilityLabel={label ?? 'profile photo'}
        source={photo}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }

  return (
    <View
      accessibilityLabel={label ?? initials}
      style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}
    >
      <Text style={[styles.initials, size >= 64 && styles.initialsLarge]}>{initials}</Text>
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
});
