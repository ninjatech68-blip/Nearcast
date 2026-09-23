// TrueGoing design tokens (docs/truegoing/06). Components use these roles,
// never raw hex values. tokens.json mirrors the colours for design tools and
// tokens.test.ts keeps the two in sync and checks contrast in both themes.

export type ColorScheme = 'light' | 'dark';

const light = {
  backgroundApp: '#F7F3EA',
  backgroundSurface: '#FFFFFF',
  backgroundSurfaceMuted: '#F1F4EC',
  backgroundInfo: '#EAF2FA',
  backgroundSuccess: '#E8F3EC',
  backgroundWarning: '#FFF5DF',
  backgroundDanger: '#FFF0EF',
  backgroundReason: '#EAF2FA',
  backgroundTrust: '#E8F3EC',
  backgroundMeetup: '#FFF5DF',
  textPrimary: '#16231F',
  textSecondary: '#52635D',
  textReason: '#1E5D8C',
  textTrust: '#0F5E46',
  actionPrimary: '#0F5E46',
  actionPrimaryPressed: '#0A4936',
  actionSecondary: '#17324D',
  onPrimary: '#FFFFFF',
  borderSubtle: '#DDD6C8',
  statusInfo: '#1E5D8C',
  statusWarning: '#8A4B00',
  statusDanger: '#A33124',
  mapPlanRing: '#0F5E46',
  mapMe: '#1E5D8C',
  scrim: '#16231F66',
} as const;

export type ThemeColors = { [K in keyof typeof light]: string };

const dark: ThemeColors = {
  backgroundApp: '#0E1714',
  backgroundSurface: '#15211D',
  backgroundSurfaceMuted: '#1E2B25',
  backgroundInfo: '#142A3A',
  backgroundSuccess: '#143025',
  backgroundWarning: '#35270F',
  backgroundDanger: '#381B18',
  backgroundReason: '#142A3A',
  backgroundTrust: '#143025',
  backgroundMeetup: '#35270F',
  textPrimary: '#F3F7F1',
  textSecondary: '#BAC8C0',
  textReason: '#A9CBEF',
  textTrust: '#8FE0BB',
  actionPrimary: '#65D0A1',
  actionPrimaryPressed: '#4FB88A',
  actionSecondary: '#8EB8E5',
  onPrimary: '#062C20',
  borderSubtle: '#33443C',
  statusInfo: '#8EB8E5',
  statusWarning: '#F4C672',
  statusDanger: '#FF9E92',
  mapPlanRing: '#65D0A1',
  mapMe: '#8EB8E5',
  scrim: '#000000AA',
};

export const themes: Record<ColorScheme, ThemeColors> = { light, dark };

// Decorative tints behind plan emoji (06 §3.2). They carry no meaning.
const tints: Record<string, { light: string; dark: string }> = {
  food: { light: '#F6E7DA', dark: '#3A2A1E' },
  outdoors: { light: '#E3F0E6', dark: '#1E3326' },
  games: { light: '#EAE6F5', dark: '#2A2637' },
  culture: { light: '#EAF2FA', dark: '#142A3A' },
  help: { light: '#FFF5DF', dark: '#35270F' },
  social: { light: '#F8E4EA', dark: '#3A1F2A' },
  wellness: { light: '#E6F3F1', dark: '#1B302D' },
  travel: { light: '#E8ECF2', dark: '#232A33' },
};

const tintByGroup: Record<string, keyof typeof tints> = {
  Sport: 'outdoors',
  Outdoors: 'outdoors',
  'Food & drinks': 'food',
  Games: 'games',
  Culture: 'culture',
  Learning: 'culture',
  'Help & favours': 'help',
  Nightlife: 'social',
  Wellness: 'wellness',
  'Rides & travel': 'travel',
};

export function categoryTint(group: string | null | undefined, scheme: ColorScheme): string {
  const key = group ? tintByGroup[group] : undefined;
  return key ? tints[key]![scheme] : themes[scheme].backgroundSurfaceMuted;
}

const DISPLAY = 'Manrope_700Bold';

export const tokens = {
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 },
  radius: { card: 20, row: 14, button: 14, sheet: 24, pill: 999 },
  size: { minTouch: 44, primaryButton: 52, avatarRow: 40, avatarCard: 56, avatarProfile: 96, tileRow: 44, tilePin: 40 },
  // UI text uses the platform font (fontFamily undefined); Manrope is display only (06 §4).
  type: {
    displayLarge: { fontFamily: DISPLAY, fontSize: 34, lineHeight: 40 },
    display: { fontFamily: DISPLAY, fontSize: 28, lineHeight: 34 },
    largeTitle: { fontFamily: undefined, fontSize: 34, lineHeight: 41, fontWeight: '700' },
    screenTitle: { fontFamily: undefined, fontSize: 28, lineHeight: 34, fontWeight: '600' },
    sectionTitle: { fontFamily: undefined, fontSize: 20, lineHeight: 26, fontWeight: '600' },
    body: { fontFamily: undefined, fontSize: 16, lineHeight: 24, fontWeight: '400' },
    bodyStrong: { fontFamily: undefined, fontSize: 16, lineHeight: 24, fontWeight: '600' },
    caption: { fontFamily: undefined, fontSize: 13, lineHeight: 18, fontWeight: '400' },
    micro: { fontFamily: undefined, fontSize: 11, lineHeight: 16, fontWeight: '500' },
  },
  motion: { press: 120, sheet: 240, page: 300, pin: 180, join: 600, skeleton: 1200 },
  // Haptic intent per event (06 §5); the adapter maps these to platform APIs.
  haptics: {
    join: 'medium',
    post: 'medium',
    spotUnlocked: 'light',
    error: 'error',
    reachStop: 'selection',
    longPress: 'light',
  },
} as const;

export type Tokens = typeof tokens;

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio between two opaque #RRGGBB colours. */
export function contrastRatio(foreground: string, background: string): number {
  const [a, b] = [luminance(foreground), luminance(background)].sort((x, y) => y - x) as [number, number];
  return (a + 0.05) / (b + 0.05);
}
