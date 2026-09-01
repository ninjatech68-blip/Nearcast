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
 *  - `GlassContainer` is not decoration. It applies
 *    `UIGlassContainerEffect`, which is what makes two glass elements
 *    MERGE as they approach -- the selected capsule flowing into the
 *    bar. A container with one child buys nothing; a container with the
 *    bar and the capsule inside is the whole effect.
 *
 * So the pill is one `GlassView` and the selection capsule is a second,
 * as siblings in one container. That is Apple's own arrangement, and it
 * is why the capsule reads as part of the bar rather than a shape on
 * top of it.
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
        {glass ? (
          // spacing is the distance at which the capsule and the bar
          // begin to merge. Roughly the capsule's own inset, so they are
          // already fused at rest rather than snapping together.
          <GlassContainer spacing={dock.pillPadV * 2} style={styles.container}>
            <Glass
              glassEffectStyle="regular"
              borderRadius={dock.pillRadius}
              isInteractive
              style={styles.pill}
            >
              {marks}
            </Glass>
            <Glass
              glassEffectStyle="clear"
              borderRadius={dock.capsuleRadius}
              tintColor={fieldFg}
              pointerEvents="none"
              style={[styles.capsule, { left: dock.pillPadH + selectedIndex * SLOT_WIDTH }]}
            />
          </GlassContainer>
        ) : (
          <View style={[styles.pill, styles.flatPill]}>
            <View
              pointerEvents="none"
              style={[styles.capsule, styles.flatCapsule, { left: dock.pillPadH + selectedIndex * SLOT_WIDTH, backgroundColor: withAlpha(fieldFg, dock.capsuleOpacity) }]}
            />
            {marks}
          </View>
        )}
      </Animated.View>

      <Animated.View
        pointerEvents="box-none"
        style={[styles.collapsedWrap, { bottom, left: dock.collapsedInset }, { opacity: collapsedOpacity }]}
      >
        {glass ? (
          <Glass
            glassEffectStyle="regular"
            borderRadius={dock.collapsedRadius}
            isInteractive
            style={styles.collapsed}
          >
            <CollapsedMark current={current} fieldFg={fieldFg} onGo={onGo} />
          </Glass>
        ) : (
          <View style={[styles.collapsed, styles.flatPill, { borderRadius: dock.collapsedRadius }]}>
            <CollapsedMark current={current} fieldFg={fieldFg} onGo={onGo} />
          </View>
        )}
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

/** a hex foreground at a given alpha, for the no-glass capsule. */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

const SLOT_WIDTH = dock.control + 24;

const styles = StyleSheet.create({
  expandedWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  collapsedWrap: { position: 'absolute' },
  container: { flexDirection: 'row' },
  pill: { flexDirection: 'row', paddingHorizontal: dock.pillPadH, paddingVertical: dock.pillPadV },
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
  flatCapsule: { borderRadius: dock.capsuleRadius },
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
