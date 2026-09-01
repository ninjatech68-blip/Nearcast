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
  // a location mark rather than broadcast waves: the feed is what is
  // happening NEAR you, and a pin is the shape that reads as "here" and,
  // unlike the radiowaves glyph, has a filled twin for the selected state.
  near: 'location',
  chats: 'bubble.left.and.bubble.right',
  alerts: 'bell',
  cast: 'plus',
  // a magnifier, not three decreasing bars: that glyph is the iOS
  // sort/filter mark and reads as a menu on a screen whose first
  // control is a search field.
  lens: 'magnifyingglass',
  camera: 'camera.fill',
};

/**
 * The filled twin, used for the selected state in the dock. Selection is a
 * solid mark against the outline of the rest -- the same language every
 * tab bar on the platform speaks. Only the marks that toggle need one; a
 * glyph with no fill variant keeps its outline.
 */
const SYMBOL_FILLED: Partial<Record<GlyphName, SFSymbol>> = {
  near: 'location.fill',
  chats: 'bubble.left.and.bubble.right.fill',
  alerts: 'bell.fill',
};

/**
 * Android has no SF Symbols. These are deliberately plain marks in the
 * app's own mono rather than emoji: an emoji in a nav bar is a different
 * typeface, a different colour system and a different voice from every
 * other pixel on the screen.
 */
const FALLBACK: Record<GlyphName, string> = {
  near: '⌖',
  chats: '(:)',
  alerts: '(!)',
  cast: '+',
  lens: '⌕',
  camera: '◎',
};

export function Glyph({
  name,
  size,
  color,
  weight = 'regular',
  filled = false,
}: {
  name: GlyphName;
  size: number;
  color: string;
  /** semibold marks the selected state, so it reads without colour. */
  weight?: 'regular' | 'semibold';
  /** the selected state: a solid mark where the rest are outlines. */
  filled?: boolean;
}) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={(filled && SYMBOL_FILLED[name]) || SYMBOL[name]}
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
