const primitive = {
  color: {
    ink: '#14120E',
    cream: '#F4EFE4',
    orange: '#FF4D00',
    yellow: '#FFC633',
    green: '#17442E',
    ink40: 'rgba(20,18,14,0.4)',
    ink12: 'rgba(20,18,14,0.12)',
    ink04: 'rgba(20,18,14,0.04)',
    ink08: 'rgba(20,18,14,0.08)',
    cream45: 'rgba(244,239,228,0.45)',
    cream16: 'rgba(244,239,228,0.16)',
    scrim: 'rgba(20,18,14,0.45)',
  },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 10: 40, 12: 48 },
  radius: { tag: 6, chip: 10, control: 14, bar: 16, poster: 0, sheet: 28, pill: 999 },
} as const;

const semantic = {
  color: {
    ink: primitive.color.ink,
    cream: primitive.color.cream,
    accent: primitive.color.orange,
    verbNeed: primitive.color.yellow,
    verbGot: primitive.color.green,
    verbLets: primitive.color.orange,
    textOnCream: primitive.color.ink,
    textMutedOnCream: primitive.color.ink40,
    hairlineOnCream: primitive.color.ink12,
    pressedOnCream: primitive.color.ink04,
    backgroundSubtle: primitive.color.ink08,
    scrim: primitive.color.scrim,
  },
} as const;

export const fontFamily = {
  display: 'BricolageGrotesque_800ExtraBold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  text: 'BricolageGrotesque_400Regular',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemi: 'IBMPlexMono_600SemiBold',
} as const;

export const tokens = {
  primitive,
  semantic,
  typography: {
    cast: { fontFamily: fontFamily.display, fontSize: 46, lineHeight: 46, letterSpacing: -1.15 },
    title: { fontFamily: fontFamily.display, fontSize: 30, lineHeight: 32, letterSpacing: -0.6 },
    screenTitle: { fontFamily: fontFamily.display, fontSize: 38, lineHeight: 40, letterSpacing: -0.95 },
    body: { fontFamily: fontFamily.text, fontSize: 17, lineHeight: 25 },
    meta: { fontFamily: fontFamily.monoMedium, fontSize: 13, lineHeight: 20 },
    metaSmall: { fontFamily: fontFamily.mono, fontSize: 12, lineHeight: 19 },
    tag: { fontFamily: fontFamily.monoSemi, fontSize: 12, lineHeight: 12, letterSpacing: 1.9 },
    tagSmall: { fontFamily: fontFamily.monoSemi, fontSize: 11, lineHeight: 11, letterSpacing: 1.3 },
  },
  motion: {
    press: { duration: 120 },
    snap: { damping: 14, stiffness: 280, mass: 0.9 },
    slide: { damping: 22, stiffness: 220, mass: 1 },
  },
  component: {
    bar: { height: 58, radius: primitive.radius.bar, paddingX: 20 },
    quiet: { minHeight: 44 },
    /**
     * The dock. Five marks across the bottom edge, on no surface at all:
     * the category field runs unbroken underneath them, because a second
     * shade of the category is the one thing not to do to a product whose
     * identity is one flat colour owning one screen.
     *
     * Geometry inside the 56 pt control row (the safe-area inset sits
     * below it): icon 10–36, label 42–53. The active pill is centred on
     * the icon; compose is centred on the icon-and-label block, which is
     * what keeps it clear of a poster's call-to-action.
     */
    dock: {
      control: 56,
      /** one size for every mark, including the avatar and the cast glyph. */
      icon: 24,
      iconTop: 10,
      labelTop: 42,
      /**
       * Selection is a colour change and nothing else: no pill, no fill.
       * An inactive mark is its ground's foreground at 70%, which is the
       * floor that keeps the tightest field (games, cream at 4.94:1 to
       * begin with) above the 3:1 WCAG asks of a UI component. Labels
       * never dim, because 11 pt is small text and owes 4.5:1; the
       * selected one goes semibold, so the state survives without colour.
       */
      inactive: 0.7,
      /**
       * The selected mark also grows, slightly. Colour is never the only
       * carrier, and 1.12 is deliberately small: it scales about the
       * centre of a fixed-size box, so the icon line and the label line
       * below it do not move as selection travels along the row.
       */
      selectedScale: 1.12,
      /** the one filled shape, centred on the same line as the marks. */
      /** the one filled shape on the edge. it takes the field's poles —
       *  fill of `fg`, glyph cut from the field — so it needs no ring;
       *  the ring only ever existed to rescue an accent fill on the
       *  social field, where button and poster were the same orange. */
      // 30% larger than it was (36), because at 36 it read as one more
      // mark rather than the one action in the row. `top` is negative
      // to keep the chip centred on the same midpoint as the marks
      // (iconTop + icon/2 = 22) now that it is taller than the line;
      // the chip is absolutely positioned, so this shifts nothing else.
      cast: { size: 46, radius: 15, top: -1 },
      /** ground-coloured, so it is invisible on a poster and stops list
       *  rows colliding with the marks on the cream screens. */
      scrim: 130,
    },
    row: { minHeight: 64 },
    field: { fontSize: 34, lineHeight: 37, maxLength: 140, warnAt: 120 },
    sheet: { radius: primitive.radius.sheet, padding: 24 },
    bars: {
      small: { widths: 5, gap: 3, radius: 2, heights: [7, 11, 15, 19, 23] },
      big: { widths: 10, gap: 5, radius: 3, heights: [14, 22, 30, 38, 46] },
    },
    /**
     * The band a poster keeps empty for the dock. 104 rather than the
     * dock's own height: compose is a 52 pt button whose top sits above
     * the control row, and at 96 it overlapped the poster's own
     * call-to-action. This leaves 19.5 pt between them.
     */
    posterBottomReserve: 104,
    minTarget: 44,
  },
} as const;

export const CATEGORIES = [
  'social',
  'sports',
  'food',
  'music',
  'travel',
  'games',
  'arts',
  'learning',
  'networking',
  'help',
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * category is the color: each category owns a flat poster field with a
 * declared ink-or-cream foreground. the category NAME always renders in
 * type as well — color is never the only carrier. ink and orange remain
 * the only chrome colors; buttons never change per category. the dock has
 * no chrome of its own: its marks take the field's own declared foreground.
 */
export const category: Record<Category, { field: string; fg: string; label: string }> = {
  social: { field: '#FF4D00', fg: primitive.color.ink, label: 'social' },
  sports: { field: '#FFC633', fg: primitive.color.ink, label: 'sports' },
  food: { field: '#FFA38B', fg: primitive.color.ink, label: 'food + drinks' },
  music: { field: '#14120E', fg: primitive.color.cream, label: 'music + nightlife' },
  travel: { field: '#17442E', fg: primitive.color.cream, label: 'travel + outdoors' },
  games: { field: '#2B5BE3', fg: primitive.color.cream, label: 'games' },
  arts: { field: '#A98BDE', fg: primitive.color.ink, label: 'arts + making' },
  learning: { field: '#8FC1E3', fg: primitive.color.ink, label: 'learning' },
  networking: { field: '#46647A', fg: primitive.color.cream, label: 'networking' },
  help: { field: '#F4EFE4', fg: primitive.color.ink, label: 'help + favors' },
};

/**
 * the opposite-pole rule: pills and dots on a poster take the field's
 * foreground as their background, so they always read as controls.
 */
export function polesFor(id: Category): { pillBg: string; pillFg: string } {
  const fg = category[id].fg;
  return fg === primitive.color.ink
    ? { pillBg: primitive.color.ink, pillFg: primitive.color.cream }
    : { pillBg: primitive.color.cream, pillFg: primitive.color.ink };
}

export type NearcastTokens = typeof tokens;
