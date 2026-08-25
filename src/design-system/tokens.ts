/**
 * Trustworthy Native Clarity tokens, cut over to the approved native semantic
 * naming on 2026-08-25 (Doc 00 decision log). Light appearance is active;
 * `semanticDark` carries the approved dark palette as data so the future
 * appearance switch is a remap, not a redesign (C-08). Raw values may appear
 * only here, in the primitive layer.
 */
const primitive = {
  color: {
    // Light surfaces
    canvas: '#F7F3EA',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F4EC',
    infoSurface: '#EAF2FA',
    successSurface: '#E8F3EC',
    warningSurface: '#FFF5DF',
    dangerSurface: '#FFF0EF',
    // Ink
    ink: '#16231F',
    inkSoft: '#52635D',
    // Accents
    green600: '#0F5E46',
    green700: '#0A4936',
    navy: '#17324D',
    infoBlue: '#1E5D8C',
    amber: '#8A4B00',
    red: '#A33124',
    // Structure and on-colors
    border: '#DDD6C8',
    white: '#FFFFFF',
    onWarningInk: '#2E2100',
    // Dark surfaces (data for the deferred appearance switch)
    darkCanvas: '#0E1714',
    darkSurface: '#15211D',
    darkSurfaceMuted: '#1E2B25',
    darkInfoSurface: '#142A3A',
    darkSuccessSurface: '#143025',
    darkWarningSurface: '#35270F',
    darkDangerSurface: '#381B18',
    darkInk: '#F3F7F1',
    darkInkSoft: '#BAC8C0',
    darkGreen: '#65D0A1',
    darkNavy: '#8EB8E5',
    darkBorder: '#33443C',
    darkOnPrimary: '#062C20',
    darkOnInfo: '#DCEEFF',
    darkOnWarning: '#FFEBC2',
    darkOnDanger: '#FFD9D4',
    darkOnSuccess: '#D6F5E6',
  },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 },
  radius: { row: 14, button: 14, card: 20, sheet: 24, pill: 999 },
  motion: { press: 120, sheet: 240, page: 300 },
} as const;

const semantic = {
  color: {
    backgroundApp: primitive.color.canvas,
    backgroundSurface: primitive.color.surface,
    backgroundSurfaceMuted: primitive.color.surfaceMuted,
    backgroundInfo: primitive.color.infoSurface,
    backgroundSuccess: primitive.color.successSurface,
    backgroundWarning: primitive.color.warningSurface,
    backgroundDanger: primitive.color.dangerSurface,
    textPrimary: primitive.color.ink,
    textSecondary: primitive.color.inkSoft,
    // The approved palette defines two text levels; muted resolves to
    // secondary and hierarchy comes from scale and weight (Doc 07 change log).
    textMuted: primitive.color.inkSoft,
    actionPrimary: primitive.color.green600,
    actionPrimaryPressed: primitive.color.green700,
    actionSecondary: primitive.color.navy,
    statusInfo: primitive.color.infoBlue,
    statusWarning: primitive.color.amber,
    statusDanger: primitive.color.red,
    borderSubtle: primitive.color.border,
    onPrimary: primitive.color.white,
    onInfo: primitive.color.white,
    onWarning: primitive.color.onWarningInk,
    onDanger: primitive.color.white,
    onSurface: primitive.color.ink,
    onSuccess: primitive.color.ink,
    focus: primitive.color.infoBlue,
  },
} as const;

/** Approved dark mapping. Data only until the appearance switch lands (C-08). */
const semanticDark = {
  color: {
    backgroundApp: primitive.color.darkCanvas,
    backgroundSurface: primitive.color.darkSurface,
    backgroundSurfaceMuted: primitive.color.darkSurfaceMuted,
    backgroundInfo: primitive.color.darkInfoSurface,
    backgroundSuccess: primitive.color.darkSuccessSurface,
    backgroundWarning: primitive.color.darkWarningSurface,
    backgroundDanger: primitive.color.darkDangerSurface,
    textPrimary: primitive.color.darkInk,
    textSecondary: primitive.color.darkInkSoft,
    textMuted: primitive.color.darkInkSoft,
    actionPrimary: primitive.color.darkGreen,
    actionPrimaryPressed: primitive.color.green700,
    actionSecondary: primitive.color.darkNavy,
    statusInfo: primitive.color.darkNavy,
    statusWarning: primitive.color.darkOnWarning,
    statusDanger: primitive.color.darkOnDanger,
    borderSubtle: primitive.color.darkBorder,
    onPrimary: primitive.color.darkOnPrimary,
    onInfo: primitive.color.darkOnInfo,
    onWarning: primitive.color.darkOnWarning,
    onDanger: primitive.color.darkOnDanger,
    onSurface: primitive.color.darkInk,
    onSuccess: primitive.color.darkOnSuccess,
    focus: primitive.color.darkNavy,
  },
} as const;

export const tokens = {
  primitive,
  semantic,
  semanticDark,
  typography: {
    family: 'Manrope',
    largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
    screenTitle: { fontSize: 28, lineHeight: 34, fontWeight: '600' },
    sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
    body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
    bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
    caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
    micro: { fontSize: 11, lineHeight: 16, fontWeight: '500' },
  },
  component: {
    button: {
      height: 48,
      radius: primitive.radius.button,
      primary: {
        background: semantic.color.actionPrimary,
        foreground: semantic.color.onPrimary,
      },
    },
    input: { minHeight: 48, radius: primitive.radius.button },
    intentCard: {
      background: semantic.color.backgroundSurface,
      border: semantic.color.borderSubtle,
      radius: primitive.radius.card,
      padding: primitive.space[4],
    },
  },
} as const;

export type NearcastTokens = typeof tokens;
