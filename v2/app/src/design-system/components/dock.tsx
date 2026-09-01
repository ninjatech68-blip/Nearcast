import { GlassContainer } from 'expo-glass-effect';
import { Animated, Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
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

/**
 * The dock: three destinations in a glass pill, and no action.
 *
 * HOW THE GLASS IS BUILT, because getting this wrong looks like a blur
 * rather than like the system:
 *
 *  - `borderRadius` is a NATIVE prop, not a style. The Swift side reads
 *    it and calls `setBorderRadius` on the UIVisualEffectView; a radius
 *    that only exists in the RN style rounds the container while the
 *    effect inside stays square.
 *  - No `overflow: 'hidden'`. Clipping on the RN side cuts the effect
 *    off instead of shaping it. The native radius is the only correct
 *    way to round glass.
 *  - No `backgroundColor`, anywhere in the stack. A ground painted over
 *    glass is just a coloured rectangle.
 *  - `GlassContainer` is the merge, not a wrapper. It applies
 *    `UIGlassContainerEffect`, whose `spacing` is the distance at which
 *    sibling glass begins to flow together -- the selection lens fusing
 *    with the bar rather than sliding on top of it.
 *  - MATERIAL FIRST, CONTENT OVER IT. The marks are drawn above the
 *    glass stack, outside any glass view. Putting them inside the bar's
 *    glass, with the selection beside it, meant the selection painted
 *    over the mark it was meant to sit behind and the mark vanished.
 *  - NO TINT, on anything. The selection is a `clear` lens in a
 *    `regular` bar and the difference between those materials is the
 *    entire indicator. It was tinted with `fieldFg`, which on every
 *    light category IS ink, so it rendered black; tinting it white
 *    would have been the same mistake pointed the other way. Glass
 *    shows what is behind it. That is the whole point of it.
 *
 * WHY IT HAS A SURFACE AT ALL. The dock this replaces refused any, on
 * the grounds that a bar with its own shade takes a tenth of the
 * category field away, and that flat colour owning the whole screen is
 * the only unmistakable thing about this app. That argument stands, and
 * glass is the exception it allows for: it refracts the field rather
 * than covering it. The test asserts no OPAQUE ground, which is the rule
 * the old one was reaching for.
 *
 * WHY COLLAPSING IS NOT THE OLD BUG. The rail two designs ago animated
 * to `opacity: 0` and restored only from `onMomentumScrollEnd`, so a
 * drag released without velocity left it invisible -- and an opacity-0
 * view in React Native still receives touches, so it went on swallowing
 * taps meant for the poster. Collapsed here is smaller and moved. It is
 * always visible and it always routes.
 */
export function Dock({
  current,
  fieldFg,
  collapse,
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
  inboxCount?: number;
  photo?: ImageSourcePropType;
  initials: string;
  onGo: (page: DockPage) => void;
}) {
  const insets = useSafeAreaInsets();
  const glass = useGlass();

  const expandedOpacity = collapse.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' });
  const collapsedOpacity = collapse.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const expandedScale = collapse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92], extrapolate: 'clamp' });

  const bottom = insets.bottom + dock.pillLift;
  const selectedIndex = DOCK_PAGES.indexOf(current);

  const marks = SLOTS.map((slot) => (
    <Mark
      key={slot.page}
      slot={slot}
      selected={slot.page === current}
      fieldFg={fieldFg}
      count={slot.page === 'inbox' ? inboxCount : 0}
      photo={photo}
      initials={initials}
      onPress={() => onGo(slot.page)}
    />
  ));

  return (
    <>
      <Animated.View
        pointerEvents="box-none"
        style={[styles.expandedWrap, { bottom }, { opacity: expandedOpacity, transform: [{ scale: expandedScale }] }]}
      >
        {/*
          Material first, content on top of it.

          The glass -- bar and selection both -- is laid down as siblings
          in a GlassContainer so UIGlassContainerEffect can merge them.
          The marks are then drawn OVER that stack, outside any glass
          view. That is the arrangement the system uses: icons and labels
          are content above the material, never inside it.

          The first version put the marks inside the bar's glass and the
          selection beside it, so the selection painted over the mark it
          was meant to sit behind, and the mark vanished.
        */}
        <View style={styles.stack}>
          {glass ? (
            <GlassContainer spacing={dock.pillPadV * 2} style={StyleSheet.absoluteFill}>
              <Glass glassEffectStyle="regular" borderRadius={dock.pillRadius} isInteractive style={StyleSheet.absoluteFill} />
              {/*
                No tintColor. None. The selection is a CLEAR lens in a
                REGULAR bar -- the difference between the two materials is
                the whole indicator. Tinting it with the field foreground
                is what turned it black on every light category; tinting
                it white would have been the same mistake in the other
                direction. Glass shows what is behind it, and that is the
                point of it.
              */}
              <Glass
                glassEffectStyle="clear"
                borderRadius={dock.capsuleRadius}
                style={[styles.capsule, { left: dock.pillPadH + selectedIndex * SLOT_WIDTH }]}
              />
            </GlassContainer>
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.flatPill]} />
          )}
          <View style={styles.row} pointerEvents="box-none">
            {marks}
          </View>
        </View>
      </Animated.View>

      <Animated.View
        pointerEvents="box-none"
        style={[styles.collapsedWrap, { bottom, left: dock.collapsedInset }, { opacity: collapsedOpacity }]}
      >
        {/* same arrangement: material, then the mark over it */}
        <View style={styles.collapsed}>
          {glass ? (
            <Glass
              glassEffectStyle="regular"
              borderRadius={dock.collapsedRadius}
              isInteractive
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.flatPill, { borderRadius: dock.collapsedRadius }]} />
          )}
          <CollapsedMark current={current} fieldFg={fieldFg} onGo={onGo} />
        </View>
      </Animated.View>
    </>
  );
}

function CollapsedMark({
  current,
  fieldFg,
  onGo,
}: {
  current: DockPage;
  fieldFg: string;
  onGo: (page: DockPage) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={countLabel('near', 0)}
      accessibilityState={{ selected: current === 'near' }}
      onPress={() => onGo('near')}
      style={styles.collapsedTouch}
      hitSlop={8}
    >
      <Glyph name="near" size={dock.icon} color={fieldFg} weight="semibold" />
    </Pressable>
  );
}

function Mark({
  slot,
  selected,
  fieldFg,
  count,
  photo,
  initials,
  onPress,
}: {
  slot: Slot;
  selected: boolean;
  fieldFg: string;
  count: number;
  photo?: ImageSourcePropType;
  initials: string;
  onPress: () => void;
}) {
  const label = LABELS[slot.page];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={countLabel(label, count)}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.slot}
      hitSlop={6}
    >
      <View style={styles.markBody}>
        {slot.kind === 'avatar' ? (
          <Avatar photo={photo} initials={initials} fieldFg={fieldFg} />
        ) : (
          <Glyph name={slot.glyph} size={dock.icon} color={fieldFg} weight={selected ? 'semibold' : 'regular'} />
        )}
        <Text
          accessible={false}
          importantForAccessibility="no"
          style={[styles.label, { color: fieldFg, fontWeight: selected ? '600' : '400' }]}
        >
          {label}
        </Text>
        {count > 0 ? (
          <View style={styles.badge}>
            <Text accessible={false} importantForAccessibility="no" style={styles.badgeText}>
              {count > 9 ? '9+' : String(count)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
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

const SLOT_WIDTH = dock.control + 24;

const styles = StyleSheet.create({
  expandedWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  collapsedWrap: { position: 'absolute' },
  container: { flexDirection: 'row' },
  // the box both layers fill. Its size comes from the row inside it,
  // so the glass is exactly as big as the marks it sits under.
  stack: { position: 'relative' },
  row: { flexDirection: 'row', paddingHorizontal: dock.pillPadH, paddingVertical: dock.pillPadV },
  // no glass: a hairline ring, so the field still runs behind the bar
  // rather than a flat plane sitting on it.
  // no glass: a hairline ring, so the field still runs behind the bar
  // rather than a flat plane sitting on it.
  flatPill: { borderRadius: dock.pillRadius, borderWidth: StyleSheet.hairlineWidth, borderColor: tokens.semantic.color.hairlineOnCream },
  capsule: {
    position: 'absolute',
    top: dock.pillPadV,
    bottom: dock.pillPadV,
    width: SLOT_WIDTH,
    borderRadius: dock.capsuleRadius,
  },
  collapsed: { width: dock.collapsedSize, height: dock.collapsedSize },
  collapsedTouch: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  slot: { width: SLOT_WIDTH, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  markBody: { alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fontFamily.text, fontSize: dock.labelSize, marginTop: dock.labelTop },
  badge: {
    position: 'absolute',
    top: -2,
    right: -10,
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
