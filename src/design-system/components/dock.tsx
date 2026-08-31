import { useMemo } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glyph, type GlyphName } from '@/design-system/components/glyph';
import { fontFamily, tokens } from '@/design-system/tokens';

export type DockPage = 'near' | 'chats' | 'alerts' | 'you';

/** the page order, which is also the swipe order. */
export const DOCK_PAGES: readonly DockPage[] = ['near', 'chats', 'alerts', 'you'];

type Slot =
  | { readonly kind: 'page'; readonly page: DockPage; readonly label: string; readonly glyph: GlyphName }
  | { readonly kind: 'avatar'; readonly page: DockPage; readonly label: string }
  | { readonly kind: 'cast'; readonly label: string };

/**
 * Five columns. Compose sits in column three, which is the only
 * arrangement that balances: four destinations plus an action is five
 * objects, and on an even grid the action lands off-centre unless it is
 * the middle one. near/you and chats/alerts are matched pairs about it.
 */
const SLOTS: readonly Slot[] = [
  { kind: 'page', page: 'near', label: 'near', glyph: 'near' },
  { kind: 'page', page: 'chats', label: 'chats', glyph: 'chats' },
  { kind: 'cast', label: 'cast' },
  { kind: 'page', page: 'alerts', label: 'alerts', glyph: 'alerts' },
  { kind: 'avatar', page: 'you', label: 'you' },
];

const dock = tokens.component.dock;

/**
 * The dock: five marks across the bottom edge, on no surface at all.
 *
 * The category field runs unbroken underneath, because the flat colour
 * owning the whole screen is the only thing about this app that is
 * unmistakably itself, and a bar with its own shade takes a tenth of it
 * away. What replaces the missing plane is the cast button — the one
 * filled shape on the edge — and the fact that a poster already reserves
 * this band, so nothing is ever underneath the marks.
 *
 * It never fades. The rail it replaces animated to `opacity: 0` on
 * scroll and only `onMomentumScrollEnd` brought it back, so a drag
 * released without velocity left it invisible indefinitely — and an
 * opacity-0 view in React Native still receives touches, so the band
 * went on swallowing every tap meant for the poster beneath it. That is
 * the bug this component exists to make unrepresentable.
 *
 * COLOUR. Marks take the ground's declared foreground: cream on the four
 * dark fields, ink on the six light ones. Cream alone would fail on six
 * of ten — 1.37:1 on sports, and exactly 1.00:1 on help, which is the
 * same colour — so `category[id].fg` is the rule, and it already exists
 * in tokens.
 *
 * SELECTION IS A COLOUR CHANGE AND NOTHING ELSE. No pill, no fill: an
 * inactive mark is the foreground at 70%, the selected one is the same
 * colour at full strength. 70% is not a taste call — it is the floor
 * that keeps the tightest field above the 3:1 WCAG asks of a UI
 * component, on games, where cream starts at only 4.94:1. The selected
 * mark also grows 12%, about the centre of a fixed box so nothing below
 * it shifts, and its label goes semibold. Labels never dim, because
 * 11 pt is small text and owes 4.5:1 — so between weight, size and
 * strength, the state still reads if colour does not.
 *
 * BLEND is the pager's horizontal offset, 0 on the feed and 1 on the
 * cream pages. Mid-swipe the screen is half poster and half cream, so no
 * single mark colour is right for both halves; cross-fading two copies
 * means at every point one of them is legible against whatever is
 * actually behind it. Only the counts sit outside that fade, because
 * accent behind ink is legible on any ground.
 *
 * THE CAST BUTTON TAKES THE FIELD'S POLES. It is filled — it is the one
 * filled shape on the edge, and the whole reason the dock can sit on no
 * surface at all — but the fill is `fieldFg` and the glyph is the field
 * itself, so the `+` reads as a hole punched through to the poster. That
 * is `polesFor` in tokens, the rule every other control on a poster
 * already follows: a control takes the field's foreground as its
 * background.
 *
 * It used to be accent orange with an ink ring, and the ring existed to
 * rescue it on the social field, where the button and the poster are the
 * same orange. A patch on a problem the button gave itself: an accent
 * that ignores the ground has no relationship to any of the ten fields,
 * so on arts and games it read as a sticker laid over the design. Taking
 * the poles means contrast is guaranteed by construction on all ten —
 * `fg` is defined against its own field — and the ring is gone. Accent
 * survives on the counts, which is the one place a colour that belongs
 * to no field is the point.
 */
export function Dock({
  current,
  fieldFg,
  fieldBg,
  blend,
  chatCount = 0,
  alertCount = 0,
  photo,
  initials,
  onGo,
  onCast,
}: {
  current: DockPage;
  /** the feed's foreground colour for the poster currently on screen. */
  fieldFg: string;
  /** that poster's own field colour — the cast glyph is punched out of it. */
  fieldBg: string;
  /** 0 = fully on the feed, 1 = fully on a cream page. */
  blend: Animated.AnimatedInterpolation<number> | Animated.Value;
  chatCount?: number;
  alertCount?: number;
  photo?: ImageSourcePropType;
  initials: string;
  onGo: (page: DockPage) => void;
  onCast: () => void;
}) {
  const insets = useSafeAreaInsets();
  const ink = tokens.semantic.color.ink;
  const cream = tokens.semantic.color.cream;
  // memoised: a fresh animated node every render churns the graph for a
  // value that only ever depends on `blend`.
  const onField = useMemo(() => Animated.subtract(1, blend), [blend]);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dock, { height: dock.control + insets.bottom, paddingBottom: insets.bottom }]}
    >
      {/* Two cross-faded colour layers carrying every mark and label.
          Hidden from assistive tech — the pressable row below labels the
          same five slots, and leaving these visible announced every
          destination three times. */}
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.layer, { paddingBottom: insets.bottom, opacity: onField }]}
      >
        <MarkRow current={current} fg={fieldFg} bg={fieldBg} initials={initials} photo={photo} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.layer, { paddingBottom: insets.bottom, opacity: blend }]}
      >
        <MarkRow current={current} fg={ink} bg={cream} initials={initials} photo={photo} />
      </Animated.View>

      {/* the row that is actually pressed. every mark's visuals, the cast
          chip included, live in the faded layers above; this row holds
          the five touch targets and the counts. */}
      <View style={styles.row}>
        {SLOTS.map((slot) =>
          slot.kind === 'cast' ? (
            <Pressable
              key="cast"
              accessibilityRole="button"
              accessibilityLabel="cast something"
              onPress={onCast}
              style={styles.column}
            >
              {/* sized to the chip drawn above it, so the target matches
                  what a thumb can see. */}
              <View style={styles.castTouch} />
            </Pressable>
          ) : (
            <Pressable
              key={slot.page}
              accessibilityRole="button"
              accessibilityState={{ selected: current === slot.page }}
              accessibilityLabel={labelFor(slot, chatCount, alertCount)}
              onPress={() => onGo(slot.page)}
              style={styles.column}
            >
              {/* the visuals live in the faded layers above; this holds
                  the column's size and the touch target. */}
              <View style={styles.markBox} />
              <Count value={slot.page === 'chats' ? chatCount : slot.page === 'alerts' ? alertCount : 0} />
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

/** one full row of marks and labels in a single ground's foreground. */
function MarkRow({
  current,
  fg,
  bg,
  initials,
  photo,
}: {
  current: DockPage;
  fg: string;
  /** the ground this row is drawn against; the cast glyph is cut from it. */
  bg: string;
  initials: string;
  photo?: ImageSourcePropType;
}) {
  return (
    <View style={styles.row}>
      {SLOTS.map((slot) => {
        const on = slot.kind !== 'cast' && current === slot.page;
        return (
          <View key={slot.kind === 'cast' ? 'cast' : slot.page} style={styles.column}>
            {slot.kind === 'cast' ? (
              // filled with this row's foreground, glyph cut from its
              // ground — so the chip belongs to whatever is behind it and
              // fades with everything else.
              <View style={[styles.cast, { backgroundColor: fg }]}>
                <Glyph name="cast" size={dock.icon} color={bg} weight="semibold" />
              </View>
            ) : (
              <View
                style={[
                  styles.markBox,
                  on ? { transform: [{ scale: dock.selectedScale }] } : { opacity: dock.inactive },
                ]}
              >
                <Mark slot={slot} fg={fg} initials={initials} photo={photo} selected={on} />
              </View>
            )}
            {/* No label under the cast chip. It is a filled action with the
                glyph punched out of it, so a word underneath repeats what
                the shape already says — and next to four tab labels it
                reads as stray text sitting behind the button. The
                pressable keeps its accessibility label, so a screen reader
                still announces it. */}
            {slot.kind === 'cast' ? null : (
              <Text style={[styles.label, on ? styles.labelOn : null, { color: fg }]}>{slot.label}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function Mark({
  slot,
  fg,
  initials,
  photo,
  selected,
}: {
  slot: Extract<Slot, { kind: 'page' | 'avatar' }>;
  fg: string;
  initials: string;
  photo?: ImageSourcePropType;
  selected: boolean;
}) {
  if (slot.kind === 'avatar') {
    return (
      <View style={[styles.avatar, { borderColor: fg, borderWidth: selected ? 2 : 1.5 }]}>
        {photo ? (
          <Image source={photo} style={styles.avatarPhoto} accessibilityLabel="" />
        ) : (
          <Text style={[styles.avatarInitials, { color: fg }]}>{initials}</Text>
        )}
      </View>
    );
  }
  return <Glyph name={slot.glyph} size={dock.icon} color={fg} weight={selected ? 'semibold' : 'regular'} />;
}

/**
 * A real count, or nothing.
 *
 * One badge, one meaning: chats counts conversations carrying unread
 * messages, alerts counts what needs a decision from you. Neither ever
 * includes something already read, because a number nobody can clear is
 * a number everybody learns to ignore.
 *
 * It rides in the always-opaque layer — accent behind ink is legible on
 * every ground, so it needs no cross-fade — and is hidden from assistive
 * tech, because the slot's own label already speaks the number.
 */
function Count({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <View
      style={styles.count}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={styles.countText} numberOfLines={1}>
        {value > 9 ? '9+' : value}
      </Text>
    </View>
  );
}

function labelFor(slot: Extract<Slot, { kind: 'page' | 'avatar' }>, chats: number, alerts: number): string {
  const n = slot.page === 'chats' ? chats : slot.page === 'alerts' ? alerts : 0;
  return n > 0 ? `${slot.label}, ${n} waiting` : slot.label;
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  layer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  row: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  column: { flex: 1, alignItems: 'center', paddingTop: dock.iconTop, minHeight: dock.control },
  // every mark sits in the same box, so the five columns share one icon
  // line and one label line whatever shape the mark itself is.
  markBox: { width: dock.icon, height: dock.icon, alignItems: 'center', justifyContent: 'center' },
  label: {
    ...tokens.typography.tagSmall,
    textTransform: 'uppercase',
    // labelTop is measured from the control row's top and the column
    // already pads by iconTop, so this is the gap between the two.
    marginTop: dock.labelTop - dock.iconTop - dock.icon,
  },
  labelOn: { fontFamily: fontFamily.monoSemi },
  avatar: {
    width: dock.icon,
    height: dock.icon,
    borderRadius: dock.icon / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarPhoto: { width: dock.icon, height: dock.icon, borderRadius: dock.icon / 2 },
  avatarInitials: { fontFamily: fontFamily.monoSemi, fontSize: 9, letterSpacing: 0.3 },
  cast: {
    position: 'absolute',
    // centred on the same line as every other mark: the marks run
    // iconTop..iconTop+icon, and this is centred on that midpoint.
    top: dock.cast.top,
    width: dock.cast.size,
    height: dock.cast.size,
    borderRadius: dock.cast.radius,
    // backgroundColor is the row's foreground, applied per layer.
    alignItems: 'center',
    justifyContent: 'center',
  },
  // the pressable's own child: the chip is drawn in the faded layers, so
  // this exists purely to give the thumb the same area to aim at.
  castTouch: { position: 'absolute', top: dock.cast.top, width: dock.cast.size, height: dock.cast.size },
  count: {
    position: 'absolute',
    top: 2,
    left: '50%',
    marginLeft: 5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: tokens.semantic.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontFamily: fontFamily.monoSemi, fontSize: 10, lineHeight: 13, color: tokens.semantic.color.ink },
});
