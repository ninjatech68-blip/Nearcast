const primitive = {
  color: {
    green50: '#EDF8F3',
    green100: '#D8EFE5',
    green500: '#248765',
    green600: '#176B50',
    green700: '#11533E',
    forest900: '#17221D',
    stone0: '#FFFFFF',
    stone50: '#F8F7F3',
    stone100: '#EFEEE8',
    stone200: '#DFDED6',
    stone500: '#777A72',
    stone700: '#444A44',
    amber50: '#FFF5DF',
    amber600: '#A85F08',
    coral50: '#FFF0EC',
    coral600: '#B8432F',
    blue50: '#EDF5FA',
    blue600: '#276A91',
  },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 },
  radius: { small: 8, control: 12, card: 16, sheet: 24, pill: 999 },
  motion: { fast: 150, standard: 220, emphasis: 320 },
} as const;

const semantic = {
  color: {
    backgroundCanvas: primitive.color.stone50,
    backgroundSurface: primitive.color.stone0,
    backgroundSubtle: primitive.color.stone100,
    textPrimary: primitive.color.forest900,
    textSecondary: primitive.color.stone700,
    textMuted: primitive.color.stone500,
    borderDefault: primitive.color.stone200,
    actionPrimary: primitive.color.green600,
    actionPrimaryPressed: primitive.color.green700,
    trustSurface: primitive.color.green50,
    trustText: primitive.color.green700,
    warningSurface: primitive.color.amber50,
    warningText: primitive.color.amber600,
    dangerSurface: primitive.color.coral50,
    dangerText: primitive.color.coral600,
    infoSurface: primitive.color.blue50,
    infoText: primitive.color.blue600,
    focus: primitive.color.blue600,
  },
} as const;

export const tokens = {
  primitive,
  semantic,
  typography: {
    family: 'Manrope',
    display: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
    title1: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
    title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
    title3: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
    bodyLarge: { fontSize: 17, lineHeight: 25, fontWeight: '400' },
    body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
    bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
    label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
    caption: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  },
  component: {
    button: {
      height: 48,
      radius: primitive.radius.control,
      primary: {
        background: semantic.color.actionPrimary,
        foreground: primitive.color.stone0,
      },
    },
    input: { minHeight: 48, radius: primitive.radius.control },
    intentCard: {
      background: semantic.color.backgroundSurface,
      border: semantic.color.borderDefault,
      radius: primitive.radius.card,
      padding: primitive.space[4],
    },
  },
} as const;

export type NearcastTokens = typeof tokens;
