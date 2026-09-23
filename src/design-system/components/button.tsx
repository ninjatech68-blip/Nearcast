import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
  /** Shown under the button. Required by the design system whenever it is disabled (04 G1). */
  reason?: string;
};

export function Button({ label, onPress, variant = 'primary', disabled = false, loading = false, reason }: ButtonProps) {
  const { colors, tokens } = useTheme();
  const unavailable = disabled || loading;
  const background =
    variant === 'primary' ? colors.actionPrimary : variant === 'destructive' ? colors.backgroundDanger : colors.backgroundSurface;
  const foreground =
    variant === 'primary' ? colors.onPrimary : variant === 'destructive' ? colors.statusDanger : colors.actionPrimary;

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityHint={unavailable && reason ? reason : undefined}
        accessibilityRole="button"
        accessibilityState={{ disabled: unavailable, busy: loading }}
        disabled={unavailable}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          {
            minHeight: tokens.size.primaryButton,
            borderRadius: tokens.radius.pill,
            backgroundColor: pressed && variant === 'primary' ? colors.actionPrimaryPressed : background,
            borderColor: variant === 'secondary' ? colors.borderSubtle : 'transparent',
          },
          unavailable && styles.unavailable,
        ]}>
        {loading ? (
          <ActivityIndicator accessibilityLabel="Loading" color={foreground} />
        ) : (
          <Text style={[tokens.type.bodyStrong, { color: foreground }]}>{label}</Text>
        )}
      </Pressable>
      {unavailable && reason ? (
        <Text style={[tokens.type.caption, styles.reason, { color: colors.textSecondary }]}>{reason}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  button: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderWidth: StyleSheet.hairlineWidth },
  unavailable: { opacity: 0.5 },
  reason: { textAlign: 'center' },
});
