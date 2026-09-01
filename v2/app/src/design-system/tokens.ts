const primitive = {
  color: {
    ink: '#14120E',
    cream: '#F4EFE4',
    orange: '#FF4D00',
    yellow: '#FFC633',
    green: '#17442E',
    /**
     * Muted ink, and SOLID rather than an alpha.
     *
     * This was ink at 40%, which composites to #9A978E on cream --
     * 2.55:1, well under the 4.5:1 that body and helper text owe. Every
     * "helper text is too faint to read" note in the design review
     * traces to this one value. 62% composites to #69665F at 4.99:1,
     * which is still visibly secondary and actually legible.
     *
     * Solid, because an alpha is only knowable against a known ground,
     * and this token is used over cream, over subtle fills, and over
     * whatever a sheet puts behind it.
     */
    inkMuted: '#69665F',
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
    textMutedOnCream: primitive.color.inkMuted,
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
      /**
       * Three destinations in a glass pill, and no action: casting moved
       * to the top right. The previous dock needed five columns because
       * four destinations plus an action lands off-centre on an even
       * grid unless the action is the middle one. Take the action out
       * and three columns balance with nothing to arrange around.
       */
      control: 56,
      icon: 24,
      /** the pill itself, floating clear of the bottom inset */
      pillRadius: 28,
      pillPadH: 8,
      pillPadV: 6,
      pillLift: 12,
      /** the lighter capsule that marks the selected slot inside it */
      capsuleRadius: 22,
      capsuleOpacity: 0.22,
      labelSize: 11,
      labelTop: 2,
      /** collapsed: one mark, bottom left, still a control */
      collapsedSize: 52,
      collapsedRadius: 18,
      collapsedInset: 16,
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
