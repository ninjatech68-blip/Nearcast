import { Pressable, StyleSheet, View } from 'react-native';

import { Glyph } from '@/design-system/components/glyph';
import { tokens } from '@/design-system/tokens';

/**
 * The lens control: search and category filter, in one target.
 *
 * It used to hang off the wordmark as "NEARCAST ⌄", which asked the
 * brand mark to be a button — a chevron on a logo is not a control
 * anybody looks for, and it meant the one interactive thing on a poster
 * that is not the cast itself had no signifier of its own.
 *
 * Now it is a real icon in the poster's top-right corner, which moving
 * profile into the dock freed up. A dot appears while a lens is on, so
 * the state is visible without reading the pill below it: the app can
 * never look empty for a reason you cannot see.
 */
export function Lens({ color, on, onPress }: { color: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? 'search and filter, a filter is on' : 'search and filter'}
      accessibilityState={{ selected: on }}
      hitSlop={10}
      onPress={onPress}
      style={styles.target}
    >
      <Glyph name="lens" size={22} color={color} weight={on ? 'semibold' : 'regular'} />
      {on ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.semantic.color.accent,
  },
});
