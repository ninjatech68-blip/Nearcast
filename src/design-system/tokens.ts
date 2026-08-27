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
    rail: { height: 46, bottomOffset: 8, castSize: 32 },
    row: { minHeight: 64 },
    field: { fontSize: 34, lineHeight: 37, maxLength: 140, warnAt: 120 },
    sheet: { radius: primitive.radius.sheet, padding: 24 },
    bars: {
      small: { widths: 5, gap: 3, radius: 2, heights: [7, 11, 15, 19, 23] },
      big: { widths: 10, gap: 5, radius: 3, heights: [14, 22, 30, 38, 46] },
    },
    posterBottomReserve: 96,
    minTarget: 44,
  },
} as const;

export type Verb = 'need' | 'got' | 'lets';

export const verbColor: Record<Verb, string> = {
  need: semantic.color.verbNeed,
  got: semantic.color.verbGot,
  lets: semantic.color.verbLets,
};

/** ink type sits on yellow and orange; cream type sits on green */
export const verbForeground: Record<Verb, string> = {
  need: primitive.color.ink,
  got: primitive.color.cream,
  lets: primitive.color.ink,
};

export const verbLabel: Record<Verb, string> = {
  need: 'NEED',
  got: 'GOT',
  lets: "LET'S",
};

export type NearcastTokens = typeof tokens;
