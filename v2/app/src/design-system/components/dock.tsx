import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useMemo } from 'react';
import { AccessibilityInfo, Animated, Image, Platform, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glyph, type GlyphName } from '@/design-system/components/glyph';
import { fontFamily, tokens } from '@/design-system/tokens';

export type DockPage = 'near' | 'inbox' | 'you';

/** the page order, which is also the swipe order. */
export const DOCK_PAGES: readonly DockPage[] = ['near', 'inbox', 'you'];

type Slot =
  | { readonly kind: 'page'; readonly page: DockPage; readonly label: string; readonly glyph: GlyphName }
  | { readonly kind: 'avatar'; readonly page: DockPage; readonly label: string };

const SLOTS: readonly Slot[] = [
  { kind: 'page', page: 'near', label: 'near', glyph: 'near' },
  { kind: 'page', page: 'inbox', label: 'inbox', glyph: 'alerts' },
  { kind: 'avatar', page: 'you', label: 'you' },
];

const dock = tokens.component.dock;

/**
 * The dock: three destinations in a glass pill, floating clear of the
 * bottom edge, and no action.
 *
 * Two things changed from the dock this replaces, and they are one
 * change rather than two.
 *
 * It has a surface now. The old one refused any, on the grounds that a
 * bar with its own shade takes a tenth of the category field away, and
 * that flat colour owning the whole screen is the only thing about this
 * app that is unmistakably itself. That argument still stands, and
 * glass is the exception it allows for: it refracts the field rather
 * than replacing it, so the colour keeps running underneath and through.
 * The test asserts no OPAQUE ground, which is the real rule the old one
 * was reaching for.
 *
 * And casting left for the top right. Those are coupled: the cast
 * button was the one filled shape holding the bottom edge together, so
 * it could only leave once the pill arrived to hold that edge instead.
 * Taking it out is also what makes three columns balance -- four
 * destinations plus an action is five objects, and on an even grid the
 * action lands off-centre unless it is the middle one.
 *
 * On scroll it collapses to a single mark at bottom left. That is not
 * the failure the previous dock existed to prevent: the rail before it
 * animated to `opacity: 0` and an opacity-0 view in React Native still
 * receives touches, so the band went on swallowing every tap meant for
 * the poster beneath it. Collapsed here means smaller and moved. It is
 * always visible and it always routes.
 *
 * Glass is iOS 26 and later. `GlassView` on Android is a plain `View`,
 * so the fallback is the flat treatment, which is what this app looked
 * like anyway -- and `isLiquidGlassAvailable()` can still be true when
 * the system is limiting the effect, hence the reduce-transparency
 * check alongside it.
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
  /** 0 expanded, 1 collapsed. Driven by vertical scroll. */
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
  const expandedScale = collapse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9], extrapolate: 'clamp' });

  const bottom = insets.bottom + dock.pillLift;

  return (
    <>
      <Animated.View
        pointerEvents="box-none"
        style={[styles.expandedWrap, { bottom }, { opacity: expandedOpacity, transform: [{ scale: expandedScale }] }]}
      >
        <Surface glass={glass} radius={dock.pillRadius} style={styles.pill}>
          {SLOTS.map((slot) => (
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
          ))}
        </Surface>
      </Animated.View>

      <Animated.View
        pointerEvents="box-none"
        style={[styles.collapsedWrap, { bottom, left: dock.collapsedInset }, { opacity: collapsedOpacity }]}
      >
        <Surface glass={glass} radius={dock.collapsedRadius} style={styles.collapsed}>
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
        </Surface>
      </Animated.View>
    </>
  );
}

/**
 * One body for both states. GlassContainer is what lets two glass
 * elements merge as they approach; there is only one child here today,
 * but the cast button in the top right is the same material and the
 * container is where a future merge would be expressed.
 */
function Surface({
  glass,
  radius,
  style,
  children,
}: {
  glass: boolean;
  radius: number;
  style: object;
  children: React.ReactNode;
}) {
  if (!glass) {
    return <View style={[style, { borderRadius: radius }]}>{children}</View>;
  }
  return (
    <GlassContainer spacing={dock.pillPadH} style={{ borderRadius: radius }}>
      <GlassView glassEffectStyle="regular" isInteractive style={[style, { borderRadius: radius }]}>
        {children}
      </GlassView>
    </GlassContainer>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={countLabel(slot.label, count)}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.slot}
      hitSlop={6}
    >
      {selected ? <View style={[styles.capsule, { backgroundColor: withAlpha(fieldFg, dock.capsuleOpacity) }]} /> : null}
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
          {slot.label}
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

function useGlass(): boolean {
  return useMemo(() => {
    if (Platform.OS !== 'ios') return false;
    if (!isLiquidGlassAvailable()) return false;
    // isLiquidGlassAvailable can be true while the system is limiting
    // the effect for accessibility. Read it once; a person changing this
    // setting mid-session gets it on the next mount, which is the same
    // deal every other appearance setting in the app gets.
    let reduced = false;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((on) => {
      reduced = on;
    });
    return !reduced;
  }, []);
}

/** a hex or rgb foreground at a given alpha, for the selection capsule. */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

const styles = StyleSheet.create({
  expandedWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  collapsedWrap: { position: 'absolute' },
  pill: {
    flexDirection: 'row',
    paddingHorizontal: dock.pillPadH,
    paddingVertical: dock.pillPadV,
    overflow: 'hidden',
  },
  collapsed: { width: dock.collapsedSize, height: dock.collapsedSize, overflow: 'hidden' },
  collapsedTouch: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  slot: { width: dock.control + 24, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  capsule: { ...StyleSheet.absoluteFill, borderRadius: dock.capsuleRadius },
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
