import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useMemo } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glyph } from '@/design-system/components/glyph';
import { tokens } from '@/design-system/tokens';

const size = 44;

/**
 * Casting, in the top right.
 *
 * It used to sit in the middle of the dock as the one filled shape on
 * the bottom edge. Moving it here is what lets the dock be three even
 * columns instead of four destinations arranged around a fifth object.
 *
 * The honest caveat, recorded because it is a real trade and not an
 * oversight: a frequent primary action belongs in the thumb zone, and
 * the top right is not it. The bar this pattern comes from puts posting
 * there and gets away with it because posting is not what most people
 * open that app to do. Casting IS what this app is for, so if reach
 * turns out to cost more than the balance is worth, this is the piece
 * to move back -- not the dock.
 */
export function CastButton({ fieldFg, onPress }: { fieldFg: string; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const glass = useGlass();

  const body = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="cast something"
      accessibilityHint="write a plan and choose who can see it"
      onPress={onPress}
      style={styles.touch}
      hitSlop={10}
    >
      <Glyph name="cast" size={22} color={fieldFg} weight="semibold" />
    </Pressable>
  );

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 6 }]}>
      {glass ? (
        <GlassContainer spacing={8} style={styles.round}>
          <GlassView glassEffectStyle="regular" isInteractive style={[styles.round, styles.body]}>
            {body}
          </GlassView>
        </GlassContainer>
      ) : (
        <View style={[styles.round, styles.body, styles.flat]}>{body}</View>
      )}
    </View>
  );
}

function useGlass(): boolean {
  return useMemo(() => {
    if (Platform.OS !== 'ios') return false;
    if (!isLiquidGlassAvailable()) return false;
    let reduced = false;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((on) => {
      reduced = on;
    });
    return !reduced;
  }, []);
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16 },
  round: { borderRadius: size / 2 },
  body: { width: size, height: size, overflow: 'hidden' },
  // no glass: a hairline ring rather than a fill, so the field still
  // runs behind it and the button is not a second accent block.
  flat: { borderWidth: StyleSheet.hairlineWidth, borderColor: tokens.semantic.color.hairlineOnCream },
  touch: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
