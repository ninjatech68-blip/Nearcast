import { GlassContainer } from 'expo-glass-effect';
import { Animated, Image, Pressable, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glyph, type GlyphName } from '@/design-system/components/glyph';
import { Glass, useGlass } from '@/design-system/glass';
import { fontFamily, tokens } from '@/design-system/tokens';

export type DockPage = 'near' | 'inbox' | 'you';

/** the page order, which is also the swipe order. */
export const DOCK_PAGES: readonly DockPage[] = ['near', 'inbox', 'you'];

type Slot =
  | { readonly kind: 'page'; readonly page: DockPage; readonly glyph: GlyphName }
  | { readonly kind: 'avatar'; readonly page: DockPage };

const SLOTS: readonly Slot[] = [
  { kind: 'page', page: 'near', glyph: 'near' },
  // the bell, because inbox holds activity and chats both and the bell
  // is the mark people already read as "things waiting for me".
  { kind: 'page', page: 'inbox', glyph: 'alerts' },
  { kind: 'avatar', page: 'you' },
];

/** the word under each mark. One place, so glyph and label never drift. */
const LABELS: Record<DockPage, string> = { near: 'near', inbox: 'inbox', you: 'you' };

const dock = tokens.component.dock;
const PILL_WIDTH = SLOTS.length * dock.slot + dock.padH * 2;
/** how far `near` must slide left to be centred in the collapsed circle */
const NEAR_SHIFT = dock.collapsedSize / 2 - (dock.padH + dock.slot / 2);

/**
 * The dock: three destinations in a glass bar that MORPHS into a single
 * mark, and no action.
 *
 * IT IS ONE ELEMENT, NOT TWO. The first version cross-faded an expanded
 * dock out and a collapsed one in, which is not what the bar it is
 * modelled on does and did not read as the same object moving. Here a
 * single container animates its width and its left edge; the bar
 * contracts and travels to the corner. That works because the geometry
 * is chosen for it: height equals the corner diameter, so a pill of that
 * height contracts into a circle and the radius never animates at all.
 *
 * The animation drives `width` and `left`, which are layout properties
 * and cannot use the native driver. That is deliberate rather than
 * careless: this is one small view with two properties, and the
 * alternative -- a scaleX transform -- squashes the glass and the marks
 * instead of resizing them.
 *
 * HOW THE GLASS IS BUILT, because getting it wrong looks like a blur
 * rather than like the system:
 *
 *  - `borderRadius` is a NATIVE prop, not a style. The Swift reads it
 *    and calls `setBorderRadius` on the UIVisualEffectView; a radius
 *    that lives only in the RN style rounds the container and leaves the
 *    effect square inside it.
 *  - No `overflow: 'hidden'`. Clipping on the RN side cuts the effect
 *    off instead of shaping it.
 *  - `GlassContainer` is the merge, not a wrapper. It applies
 *    `UIGlassContainerEffect`, whose `spacing` is the distance at which
 *    sibling glass begins to flow together.
 *  - MATERIAL FIRST, CONTENT OVER IT. The marks are drawn above the
 *    glass, outside any glass view. Putting them inside the bar's glass
 *    with the selection beside it meant the selection painted over the
 *    mark it was meant to sit behind, and the mark vanished.
 *  - NO TINT, on anything. The selection is a `clear` lens in a
 *    `regular` bar and the difference between those materials is the
 *    entire indicator. It was tinted `fieldFg`, which on every light
 *    category IS ink, so it rendered black; white would have been the
 *    same mistake pointed the other way. Glass shows what is behind it.
 *
 * WHY IT HAS A SURFACE AT ALL. The dock this replaces refused one, on
 * the grounds that a bar with its own shade takes a tenth of the
 * category field away. That argument stands and glass is the exception
 * it allows for: it refracts the field rather than covering it. The test
 * asserts no OPAQUE ground, which is the rule the old one was reaching
 * for.
 *
 * WHY COLLAPSING IS NOT THE OLD BUG. The rail two designs ago animated
 * to `opacity: 0` and an opacity-0 view in React Native still receives
 * touches, so it went on swallowing taps meant for the poster beneath
 * it. Collapsed here is a smaller shape in the corner: visible, and it
 * routes.
 */
export function Dock({
  current,
  fieldFg,
  collapse,
  collapsed,
  inboxCount = 0,
  photo,
  initials,
  onGo,
}: {
  current: DockPage;
  /** the legible foreground for whatever field is behind the dock */
  fieldFg: string;
  /** 0 expanded, 1 collapsed. */
  collapse: Animated.Value | Animated.AnimatedInterpolation<number>;
  /**
   * The same state as a boolean, because opacity is not hit testing.
   *
   * An opacity-0 view in React Native still receives touches. That is
   * the exact bug the rail two designs ago shipped, and fading the two
   * outer marks without this would have reintroduced it -- they sit
   * outside the contracted circle, invisible, and would go on taking
   * taps meant for the content behind them.
   */
  collapsed?: boolean;
  inboxCount?: number;
  photo?: ImageSourcePropType;
  initials: string;
  onGo: (page: DockPage) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: screen } = useWindowDimensions();
  const glass = useGlass();

  /**
   * The marks are ink whenever there is glass, and the field's own
   * declared foreground when there is not.
   *
   * Tracking the field was the bug. Four categories are dark and declare
   * `fg: cream` -- music, travel, games, networking -- and the visible
   * category is not cleared when you leave the feed, so a cream mark
   * from a music poster landed on the cream inbox and disappeared.
   *
   * Ink on the RAW fields is not the answer either: it measures 1.00:1
   * on music, 1.69:1 on travel and 3.00:1 on networking. What makes ink
   * work everywhere is that the bar is forced to its LIGHT glass
   * variant, so the surface under the mark is always a light scrim over
   * the field rather than the field itself. Modelled that way the worst
   * category is 5.57:1, against the 3:1 a UI component owes.
   *
   * Without glass there is no scrim, so the flat path keeps the field's
   * own pairing -- which the category tokens already guarantee is
   * legible, because they were chosen as pairs.
   */
  const mark = glass ? tokens.semantic.color.ink : fieldFg;

  const selectedIndex = DOCK_PAGES.indexOf(current);
  const range = { inputRange: [0, 1], extrapolate: 'clamp' as const };

  // the whole morph: a width and a left edge.
  const width = collapse.interpolate({ ...range, outputRange: [PILL_WIDTH, dock.collapsedSize] });
  const left = collapse.interpolate({
    ...range,
    outputRange: [(screen - PILL_WIDTH) / 2, dock.collapsedInset],
  });
  // `near` slides so it lands centred in the circle rather than at the
  // left padding it occupies while the bar is wide.
  const shift = collapse.interpolate({ ...range, outputRange: [0, NEAR_SHIFT] });
  // the other two, and every label, are gone well before the bar is
  // narrow enough to crowd them.
  const others = collapse.interpolate({ inputRange: [0, 0.35], outputRange: [1, 0], extrapolate: 'clamp' });
  const labels = collapse.interpolate({ inputRange: [0, 0.25], outputRange: [1, 0], extrapolate: 'clamp' });
  const lens = collapse.interpolate({ inputRange: [0, 0.2], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.stack, { bottom: insets.bottom + dock.lift, width, left }]}
    >
      {glass ? (
        <GlassContainer spacing={dock.capsuleInset * 2} style={StyleSheet.absoluteFill}>
          <Glass glassEffectStyle="regular" colorScheme="light" borderRadius={dock.radius} isInteractive style={StyleSheet.absoluteFill} />
          <Animated.View
            pointerEvents="none"
            style={[styles.lensWrap, { opacity: lens, left: dock.padH + selectedIndex * dock.slot }]}
          >
            <Glass glassEffectStyle="clear" colorScheme="light" borderRadius={dock.capsuleRadius} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </GlassContainer>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.flat]} />
      )}

      <Animated.View style={[styles.row, { transform: [{ translateX: shift }] }]} pointerEvents="box-none">
        {SLOTS.map((slot) => (
          <Mark
            key={slot.page}
            slot={slot}
            selected={slot.page === current}
            fieldFg={mark}
            count={slot.page === 'inbox' ? inboxCount : 0}
            photo={photo}
            initials={initials}
            labelOpacity={labels}
            // `near` is what the collapsed circle keeps, so it never fades
            markOpacity={slot.page === 'near' ? undefined : others}
            // near survives the contraction; the other two stop being
            // targets the moment they start disappearing.
            reachable={slot.page === 'near' || !collapsed}
            onPress={() => onGo(slot.page)}
          />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

function Mark({
  slot,
  selected,
  fieldFg,
  count,
  photo,
  initials,
  labelOpacity,
  markOpacity,
  reachable,
  onPress,
}: {
  slot: Slot;
  selected: boolean;
  fieldFg: string;
  count: number;
  photo?: ImageSourcePropType;
  initials: string;
  labelOpacity: Animated.AnimatedInterpolation<number>;
  markOpacity?: Animated.AnimatedInterpolation<number>;
  reachable: boolean;
  onPress: () => void;
}) {
  const label = LABELS[slot.page];
  return (
    <Animated.View
      style={markOpacity ? { opacity: markOpacity } : undefined}
      pointerEvents={reachable ? 'auto' : 'none'}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={countLabel(label, count)}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={styles.slot}
        hitSlop={6}
      >
        {slot.kind === 'avatar' ? (
          <Avatar photo={photo} initials={initials} fieldFg={fieldFg} />
        ) : (
          <Glyph name={slot.glyph} size={dock.icon} color={fieldFg} weight={selected ? 'semibold' : 'regular'} />
        )}
        <Animated.Text
          accessible={false}
          importantForAccessibility="no"
          style={[styles.label, { color: fieldFg, fontWeight: selected ? '600' : '400', opacity: labelOpacity }]}
        >
          {label}
        </Animated.Text>
        {count > 0 ? (
          <View style={styles.badge}>
            <Text accessible={false} importantForAccessibility="no" style={styles.badgeText}>
              {count > 9 ? '9+' : String(count)}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function Avatar({ photo, initials, fieldFg }: { photo?: ImageSourcePropType; initials: string; fieldFg: string }) {
  if (photo) return <Image source={photo} style={styles.avatar} />;
  return (
    <View style={[styles.avatar, styles.avatarInitials, { borderColor: fieldFg }]}>
      <Text accessible={false} importantForAccessibility="no" style={[styles.initials, { color: fieldFg }]}>
        {initials}
      </Text>
    </View>
  );
}

/** the spoken label never rounds, so a screen reader hears the real number. */
function countLabel(name: string, count: number): string {
  return count > 0 ? `${name}, ${count} waiting` : name;
}

const styles = StyleSheet.create({
  stack: { position: 'absolute', height: dock.height },
  // no glass: a hairline ring, so the field still runs behind the bar
  // rather than a flat plane sitting on it.
  flat: {
    borderRadius: dock.radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.semantic.color.hairlineOnCream,
  },
  lensWrap: {
    position: 'absolute',
    top: dock.capsuleInset,
    bottom: dock.capsuleInset,
    width: dock.slot,
  },
  row: { ...StyleSheet.absoluteFill, flexDirection: 'row', paddingHorizontal: dock.padH },
  slot: { width: dock.slot, height: '100%', alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fontFamily.text, fontSize: dock.labelSize, marginTop: dock.labelTop },
  badge: {
    position: 'absolute',
    top: 6,
    right: 16,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.semantic.color.accent,
  },
  badgeText: { fontFamily: fontFamily.text, fontSize: 10, fontWeight: '700', color: tokens.primitive.color.cream },
  avatar: { width: dock.icon, height: dock.icon, borderRadius: dock.icon / 2 },
  avatarInitials: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  initials: { fontFamily: fontFamily.text, fontSize: 10, fontWeight: '600' },
});
