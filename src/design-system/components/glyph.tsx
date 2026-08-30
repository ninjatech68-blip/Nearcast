import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Platform, StyleSheet, Text } from 'react-native';

import { fontFamily } from '@/design-system/tokens';

/**
 * The app's one icon primitive.
 *
 * Nearcast is type-led — the design system is Bricolage and IBM Plex and
 * almost nothing else — so icons are used only where a word will not
 * fit: the dock, and the lens control on a poster. They are SF Symbols
 * rather than a bundled icon font, which is what the attach tiles in
 * chat already do, and they inherit weight and optical size from the
 * platform instead of from a second set of assets to keep in sync.
 *
 * Android has no SF Symbols, so every call site declares a text glyph
 * to fall back to. Nothing here renders an empty box.
 */
export type GlyphName = 'near' | 'chats' | 'alerts' | 'cast' | 'lens' | 'camera';

const SYMBOL: Record<GlyphName, SFSymbol> = {
  near: 'dot.radiowaves.left.and.right',
  chats: 'bubble.left.and.bubble.right',
  alerts: 'bell',
  cast: 'plus',
  lens: 'line.3.horizontal.decrease',
  camera: 'camera.fill',
};

/**
 * Android has no SF Symbols. These are deliberately plain marks in the
 * app's own mono rather than emoji: an emoji in a nav bar is a different
 * typeface, a different colour system and a different voice from every
 * other pixel on the screen.
 */
const FALLBACK: Record<GlyphName, string> = {
  near: '((•))',
  chats: '(:)',
  alerts: '(!)',
  cast: '+',
  lens: '≡',
  camera: '◎',
};

export function Glyph({
  name,
  size,
  color,
  weight = 'regular',
}: {
  name: GlyphName;
  size: number;
  color: string;
  /** semibold marks the selected state, so it reads without colour. */
  weight?: 'regular' | 'semibold';
}) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={SYMBOL[name]}
        size={size}
        tintColor={color}
        weight={weight}
        resizeMode="scaleAspectFit"
      />
    );
  }
  return <Text style={[styles.fallback, { fontSize: size * 0.8, color }]}>{FALLBACK[name]}</Text>;
}

const styles = StyleSheet.create({
  fallback: { fontFamily: fontFamily.displaySemi, textAlign: 'center' },
});
