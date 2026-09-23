import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { Icon } from './icon';

type AvatarProps = { name: string; uri?: string | null; size?: number; verified?: boolean };

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0]![0], words[words.length - 1]![0]] : [words[0]?.[0]];
  return letters.filter(Boolean).join('').toUpperCase();
}

/** Photo, or initials on a muted circle (never a generic silhouette, 06 §7.3). */
export function Avatar({ name, uri, size = 40, verified = false }: AvatarProps) {
  const { colors, tokens } = useTheme();
  return (
    <View accessibilityLabel={verified ? `${name}, verified` : name} accessible style={{ width: size, height: size }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} testID="avatar-image" />
      ) : (
        <View
          style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.backgroundSurfaceMuted }]}>
          <Text style={[tokens.type.bodyStrong, { color: colors.textSecondary, fontSize: size * 0.38 }]}>{initials(name)}</Text>
        </View>
      )}
      {verified && size >= 40 ? (
        <View style={[styles.badge, { backgroundColor: colors.backgroundSurface }]}>
          <Icon color="actionPrimary" label={null} name="verified" size={14} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -2, bottom: -2, borderRadius: 10, padding: 1 },
});
