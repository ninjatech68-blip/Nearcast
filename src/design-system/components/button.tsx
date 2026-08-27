import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';

type BarVariant = 'onInk' | 'onCream' | 'onOrange';

type BarButtonProps = {
  label: string;
  onPress: () => void;
  variant?: BarVariant;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
};

const background: Record<BarVariant, string> = {
  onInk: tokens.semantic.color.ink,
  onCream: tokens.semantic.color.cream,
  onOrange: tokens.semantic.color.accent,
};

const foreground: Record<BarVariant, string> = {
  onInk: tokens.semantic.color.cream,
  onCream: tokens.semantic.color.ink,
  onOrange: tokens.semantic.color.ink,
};

/** the bar: one fat action. every tap scales to .96 immediately; input is never silent. */
export function BarButton({ label, onPress, variant = 'onInk', disabled = false, loading = false, loadingLabel }: BarButtonProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const unavailable = disabled || loading;

  function pressIn() {
    Animated.timing(scale, { toValue: 0.96, duration: tokens.motion.press.duration, useNativeDriver: true }).start();
  }

  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...tokens.motion.snap }).start();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.bar,
          { backgroundColor: background[variant], transform: [{ scale }] },
          unavailable && styles.disabled,
        ]}
      >
        {loading ? (
          <LoaderBars color={foreground[variant]} label={loadingLabel} labelColor={foreground[variant]} />
        ) : (
          <Text style={[styles.label, { color: foreground[variant] }]}>{label}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** the quiet action: one per bar at most. */
export function QuietAction({ label, onPress, color }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.quiet, pressed && styles.quietPressed]}
    >
      <Text style={[styles.quietLabel, color ? { color } : null]}>{label}</Text>
    </Pressable>
  );
}

/** the equalizer: the only loop in the app. */
export function LoaderBars({ color, label, labelColor }: { color: string; label?: string; labelColor?: string }) {
  return (
    <View style={styles.loaderRow}>
      <View accessibilityLabel="loading" style={styles.loader}>
        {[0, 1, 2, 3, 4].map((i) => (
          <LoaderBar key={i} color={color} delay={i * 120} />
        ))}
      </View>
      {label ? <Text style={[styles.label, { color: labelColor ?? color }]}>{label}</Text> : null}
    </View>
  );
}

function LoaderBar({ color, delay }: { color: string; delay: number }) {
  const [grow] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(grow, { toValue: 1.6, duration: 450, useNativeDriver: true }),
        Animated.timing(grow, { toValue: 0.4, duration: 450, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [grow, delay]);

  return <Animated.View style={[styles.loaderBar, { backgroundColor: color, transform: [{ scaleY: grow }] }]} />;
}

export { haptic };

const styles = StyleSheet.create({
  bar: {
    minHeight: tokens.component.bar.height,
    borderRadius: tokens.component.bar.radius,
    paddingHorizontal: tokens.component.bar.paddingX,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  disabled: { opacity: 0.45 },
  label: { fontFamily: fontFamily.display, fontSize: 17, letterSpacing: -0.15 },
  quiet: {
    minHeight: tokens.component.quiet.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  quietPressed: { opacity: 0.35 },
  quietLabel: { fontFamily: fontFamily.displaySemi, fontSize: 14 },
  loaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loader: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 23 },
  loaderBar: { width: 5, height: 12, borderRadius: 2 },
});
