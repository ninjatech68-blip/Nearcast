import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/design-system/tokens';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  trailingIcon?: React.ReactNode;
  leadingIcon?: React.ReactNode;
  fullWidth?: boolean;
};

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  trailingIcon,
  leadingIcon,
  fullWidth = true,
}: ButtonProps) {
  const unavailable = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        fullWidth && styles.fullWidth,
        pressed && !unavailable && (variant === 'primary' ? styles.primaryPressed : styles.pressed),
        unavailable && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : tokens.semantic.color.actionPrimary} />
      ) : (
        <View style={styles.inner}>
          {leadingIcon}
          <Text
            style={[
              styles.label,
              variant === 'primary' && styles.labelPrimary,
              variant === 'secondary' && styles.labelSecondary,
              variant === 'ghost' && styles.labelGhost,
              variant === 'danger' && styles.labelDanger,
            ]}
          >
            {label}
          </Text>
          {trailingIcon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: tokens.component.button.height,
    borderRadius: tokens.component.button.radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  fullWidth: { alignSelf: 'stretch' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primary: { backgroundColor: tokens.semantic.color.actionPrimary },
  primaryPressed: { backgroundColor: tokens.semantic.color.actionPrimaryPressed },
  secondary: {
    backgroundColor: tokens.semantic.color.actionSecondaryBackground,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: tokens.semantic.color.dangerText },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
  label: { fontFamily: 'Manrope_700Bold', fontSize: 14 },
  labelPrimary: { color: tokens.component.button.primary.foreground },
  labelSecondary: { color: tokens.semantic.color.textPrimary },
  labelGhost: { color: tokens.semantic.color.actionPrimary },
  labelDanger: { color: '#FFFFFF' },
});
