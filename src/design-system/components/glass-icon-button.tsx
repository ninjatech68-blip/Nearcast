import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Icon, type IconName } from './icon';

type GlassIconButtonProps = { icon: IconName; label: string; onPress: () => void };

/**
 * Round floating button, used only over the map (06 §5). Liquid Glass where the
 * platform has it, a solid surface elsewhere.
 */
export function GlassIconButton({ icon, label, onPress }: GlassIconButtonProps) {
  const { colors, tokens } = useTheme();
  const size = tokens.size.minTouch + 4;
  const Surface = isLiquidGlassAvailable() ? GlassView : View;
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" hitSlop={4} onPress={onPress}>
      <Surface
        style={[
          styles.surface,
          { width: size, height: size, borderRadius: size / 2 },
          !isLiquidGlassAvailable() && { backgroundColor: colors.backgroundSurface, borderColor: colors.borderSubtle },
        ]}>
        <Icon label={null} name={icon} />
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
});
