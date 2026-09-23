import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { categoryTint } from '../tokens';

type CategoryTileProps = { emoji: string; group?: string | null; size?: number; ring?: boolean };

/** The plan's emoji on its category tint (06 §7.2). Decorative: the plan title carries the meaning. */
export function CategoryTile({ emoji, group, size = 44, ring = false }: CategoryTileProps) {
  const { colors, scheme } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: categoryTint(group, scheme),
          borderWidth: ring ? 2 : 0,
          borderColor: colors.mapPlanRing,
        },
      ]}
      testID="category-tile">
      <Text style={{ fontSize: size * 0.55 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ tile: { alignItems: 'center', justifyContent: 'center' } });
