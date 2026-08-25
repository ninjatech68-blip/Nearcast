/**
 * Nearcast design tokens.
 *
 * Every value here is transcribed from the approved visual contract in
 * DESIGN.md, which is itself governed by `docs/17 - Mobile App Design
 * Foundation.md` and `docs/07 - Design System Specification.md`.
 *
 * Raw hex values belong in this file only. Components must consume semantic
 * tokens through `colorsFor(appearance)` so that light and dark appearances
 * stay in step.
 *
 * Typography intentionally omits a font family: DESIGN.md maps type to the
 * native platform faces (SF Pro on iOS, Roboto on Android), so components
 * inherit the system font and only apply the shared size/weight hierarchy.
 */

export const APPEARANCES = ['light', 'dark'] as const;

export type Appearance = (typeof APPEARANCES)[number];

export type ColorScheme = {
  background: {
    app: string;
    surface: string;
    surfaceMuted: string;
    info: string;
    success: string;
    warning: string;
    danger: string;
  };
  text: {
    primary: string;
    secondary: string;
  };
  action: {
    primary: string;
    primaryPressed: string;
    secondary: string;
  };
  border: {
    subtle: string;
    focus: string;
  };
  status: {
    info: string;
    warning: string;
    danger: string;
  };
  on: {
    primary: string;
    info: string;
    warning: string;
    danger: string;
    surface: string;
    success: string;
  };
};

const light: ColorScheme = {
  background: {
    app: '#F7F3EA',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F4EC',
    info: '#EAF2FA',
    success: '#E8F3EC',
    warning: '#FFF5DF',
    danger: '#FFF0EF',
  },
  text: {
    primary: '#16231F',
    secondary: '#52635D',
  },
  action: {
    primary: '#0F5E46',
    primaryPressed: '#0A4936',
    secondary: '#17324D',
  },
  border: {
    subtle: '#DDD6C8',
    /** Focus reuses the provenance action colour rather than introducing a hue. */
    focus: '#17324D',
  },
  status: {
    info: '#1E5D8C',
    warning: '#8A4B00',
    danger: '#A33124',
  },
  on: {
    primary: '#FFFFFF',
    info: '#FFFFFF',
    warning: '#2E2100',
    danger: '#FFFFFF',
    surface: '#16231F',
    success: '#16231F',
  },
};

const dark: ColorScheme = {
  background: {
    app: '#0E1714',
    surface: '#15211D',
    surfaceMuted: '#1E2B25',
    info: '#142A3A',
    success: '#143025',
    warning: '#35270F',
    danger: '#381B18',
  },
  text: {
    primary: '#F3F7F1',
    secondary: '#BAC8C0',
  },
  action: {
    primary: '#65D0A1',
    primaryPressed: '#4FBA8C',
    secondary: '#8EB8E5',
  },
  border: {
    subtle: '#33443C',
    focus: '#8EB8E5',
  },
  status: {
    info: '#DCEEFF',
    warning: '#FFEBC2',
    danger: '#FFD9D4',
  },
  on: {
    primary: '#062C20',
    info: '#DCEEFF',
    warning: '#FFEBC2',
    danger: '#FFD9D4',
    surface: '#F3F7F1',
    success: '#D6F5E6',
  },
};

const color = { light, dark } as const;

/** Resolve the semantic palette for an appearance. */
export function colorsFor(appearance: Appearance): ColorScheme {
  return color[appearance];
}

const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;

const radius = { card: 20, row: 14, button: 14, pill: 999 } as const;

const motion = { press: 120, sheet: 240, page: 300 } as const;

const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  screenTitle: { fontSize: 28, lineHeight: 34, fontWeight: '600' },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  micro: { fontSize: 11, lineHeight: 16, fontWeight: '500' },
} as const;

/** Elevation is capped at two roles: soft card separation and the raised broadcast action. */
const elevation = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  broadcast: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;

const touchTarget = { ios: 44, android: 48 } as const;

const component = {
  button: {
    height: touchTarget.android,
    radius: radius.button,
    paddingHorizontal: space[5],
    gap: space[2],
  },
  input: {
    minHeight: touchTarget.android,
    radius: radius.button,
    padding: space[4],
  },
  intentCard: {
    radius: radius.card,
    padding: space[5],
    gap: space[3],
  },
  row: {
    minHeight: touchTarget.android,
    radius: radius.row,
    padding: space[4],
    gap: space[3],
  },
  pill: {
    radius: radius.pill,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    gap: space[1],
  },
  sheet: {
    radius: radius.card,
    padding: space[5],
    gap: space[4],
  },
} as const;

export const tokens = {
  color,
  type,
  space,
  radius,
  motion,
  elevation,
  touchTarget,
  component,
} as const;

export type NearcastTokens = typeof tokens;
