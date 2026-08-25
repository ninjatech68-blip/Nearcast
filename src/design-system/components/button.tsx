import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { accentFor } from '@/design-system/accents';
import { useAppearance } from '@/design-system/appearance';
import { isInteractionBlocked, resolveComponentState } from '@/design-system/state';
import { colorsFor, tokens } from '@/design-system/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Explains why the action is unavailable; surfaced to assistive technology. */
  unavailableReason?: string;
  accessibilityHint?: string;
};

/**
 * The primary interactive control.
 *
 * `primary` carries consent and primary actions, `secondary` carries
 * information and provenance actions, `outline` is the recovery styling used by
 * retry, and `danger` is reserved for destructive meaning.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  unavailableReason,
  accessibilityHint,
}: ButtonProps) {
  const appearance = useAppearance();
  const color = colorsFor(appearance);
  const state = resolveComponentState({ disabled, loading });
  const blocked = isInteractionBlocked(state);

  const accent =
    variant === 'outline'
      ? {
          background: 'transparent',
          foreground: color.action.primary,
          border: color.action.primary,
        }
      : accentFor(appearance, variant);

  const pressedBackground =
    variant === 'primary' ? color.action.primaryPressed : accent.background;

  return (
    <Pressable
      accessibilityHint={disabled ? (unavailableReason ?? accessibilityHint) : accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: blocked }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed && !blocked ? pressedBackground : accent.background,
          borderColor: accent.border,
        },
        pressed && !blocked && variant !== 'primary' && styles.pressed,
        state === 'disabled' && styles.disabled,
      ]}>
      {loading ? (
        <ActivityIndicator color={accent.foreground} />
      ) : (
        <Text style={[styles.label, { color: accent.foreground }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: tokens.component.button.radius,
    borderWidth: StyleSheet.hairlineWidth,
    gap: tokens.component.button.gap,
    justifyContent: 'center',
    minHeight: tokens.component.button.height,
    paddingHorizontal: tokens.component.button.paddingHorizontal,
  },
  disabled: { opacity: 0.45 },
  label: { ...tokens.type.bodyStrong, textAlign: 'center' },
  pressed: { opacity: 0.88 },
});
