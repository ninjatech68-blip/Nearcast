import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { tokens } from '@/design-system/tokens';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ label, onPress, disabled = false, loading = false }: ButtonProps) {
  const unavailable = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, unavailable && styles.disabled]}>
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: tokens.component.button.height, borderRadius: tokens.component.button.radius, backgroundColor: tokens.component.button.primary.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  pressed: { backgroundColor: tokens.semantic.color.actionPrimaryPressed },
  disabled: { opacity: 0.45 },
  label: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: tokens.component.button.primary.foreground },
});
