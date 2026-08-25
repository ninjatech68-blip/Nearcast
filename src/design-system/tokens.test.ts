import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { APPEARANCES, type Appearance, colorsFor, tokens } from './tokens';

/**
 * Every expectation in this file is transcribed from the approved visual
 * contract in DESIGN.md. When the contract changes, update DESIGN.md first,
 * then this table, then the implementation.
 */
const approvedColors: Record<Appearance, Record<string, string>> = {
  light: {
    'background.app': '#F7F3EA',
    'background.surface': '#FFFFFF',
    'background.surfaceMuted': '#F1F4EC',
    'background.info': '#EAF2FA',
    'background.success': '#E8F3EC',
    'background.warning': '#FFF5DF',
    'background.danger': '#FFF0EF',
    'text.primary': '#16231F',
    'text.secondary': '#52635D',
    'action.primary': '#0F5E46',
    'action.primaryPressed': '#0A4936',
    'action.secondary': '#17324D',
    'border.subtle': '#DDD6C8',
    'status.info': '#1E5D8C',
    'status.warning': '#8A4B00',
    'status.danger': '#A33124',
    'on.primary': '#FFFFFF',
    'on.info': '#FFFFFF',
    'on.warning': '#2E2100',
    'on.danger': '#FFFFFF',
    'on.surface': '#16231F',
    'on.success': '#16231F',
  },
  dark: {
    'background.app': '#0E1714',
    'background.surface': '#15211D',
    'background.surfaceMuted': '#1E2B25',
    'background.info': '#142A3A',
    'background.success': '#143025',
    'background.warning': '#35270F',
    'background.danger': '#381B18',
    'text.primary': '#F3F7F1',
    'text.secondary': '#BAC8C0',
    'action.primary': '#65D0A1',
    'action.primaryPressed': '#8ADDB8',
    'action.secondary': '#8EB8E5',
    'border.subtle': '#33443C',
    'status.info': '#8EB8E5',
    'status.warning': '#FFE2A7',
    'status.danger': '#FFD9D4',
    'on.primary': '#062C20',
    'on.info': '#DCEEFF',
    'on.warning': '#FFEBC2',
    'on.danger': '#FFD9D4',
    'on.surface': '#F3F7F1',
    'on.success': '#D6F5E6',
  },
};

const read = (source: Record<string, unknown>, dotted: string): unknown =>
  dotted.split('.').reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], source);

const relativeLuminance = (hex: string): number => {
  const channels = [1, 3, 5]
    .map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrastRatio = (foreground: string, background: string): number => {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  );

  return (lighter + 0.05) / (darker + 0.05);
};

describe('semantic color tokens', () => {
  it.each(APPEARANCES)('matches the approved %s appearance exactly', (appearance) => {
    const scheme = colorsFor(appearance) as unknown as Record<string, unknown>;

    for (const [dotted, value] of Object.entries(approvedColors[appearance])) {
      expect(read(scheme, dotted), `${appearance} ${dotted}`).toBe(value);
    }
  });

  it('exposes the same token paths in both appearances', () => {
    const paths = (scheme: object): string[] =>
      Object.entries(scheme).flatMap(([group, values]) =>
        Object.keys(values as object).map((name) => `${group}.${name}`),
      );

    expect(paths(colorsFor('dark')).sort()).toEqual(paths(colorsFor('light')).sort());
  });

  it('resolves the focus indicator to the provenance action colour, not a new hue', () => {
    for (const appearance of APPEARANCES) {
      const scheme = colorsFor(appearance);
      expect(scheme.border.focus).toBe(scheme.action.secondary);
    }
  });
});

describe('accessibility contract', () => {
  const sharedPairs = [
    ['text.primary', 'background.app'],
    ['text.primary', 'background.surface'],
    ['text.primary', 'background.surfaceMuted'],
    ['text.secondary', 'background.app'],
    ['text.secondary', 'background.surface'],
    ['text.secondary', 'background.surfaceMuted'],
    ['on.surface', 'background.surface'],
    ['on.primary', 'action.primary'],
    ['on.primary', 'action.primaryPressed'],
    ['on.warning', 'background.warning'],
    ['on.success', 'background.success'],
    ['action.primary', 'background.success'],
    ['status.info', 'background.info'],
    ['status.warning', 'background.warning'],
    ['status.danger', 'background.danger'],
  ] as const;

  /**
   * `on.info` and `on.danger` are deliberately absent: the approved treatments
   * never fill an info or danger accent, so those two tokens have no consumer
   * and no surface to be measured against. See DESIGN.md.
   */
  it.each(APPEARANCES)('meets WCAG AA 4.5:1 for every %s text pair', (appearance) => {
    const scheme = colorsFor(appearance) as unknown as Record<string, unknown>;

    for (const [foreground, background] of sharedPairs) {
      const ratio = contrastRatio(read(scheme, foreground) as string, read(scheme, background) as string);
      expect(ratio, `${appearance} ${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(APPEARANCES)('keeps the %s focus indicator above 3:1 against both canvases', (appearance) => {
    const scheme = colorsFor(appearance);

    expect(contrastRatio(scheme.border.focus, scheme.background.app)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(scheme.border.focus, scheme.background.surface)).toBeGreaterThanOrEqual(3);
  });

  it('keeps touch targets at the platform minimums', () => {
    expect(tokens.touchTarget.ios).toBeGreaterThanOrEqual(44);
    expect(tokens.touchTarget.android).toBeGreaterThanOrEqual(48);
    expect(tokens.component.button.height).toBeGreaterThanOrEqual(tokens.touchTarget.android);
    expect(tokens.component.input.minHeight).toBeGreaterThanOrEqual(tokens.touchTarget.android);
  });
});

describe('shape, spacing, and motion tokens', () => {
  it('matches the approved type scale', () => {
    expect(tokens.type).toMatchObject({
      largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
      screenTitle: { fontSize: 28, lineHeight: 34, fontWeight: '600' },
      sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
      body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
      bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
      caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
      micro: { fontSize: 11, lineHeight: 16, fontWeight: '500' },
    });
  });

  it('matches the approved radius scale', () => {
    expect(tokens.radius).toEqual({ card: 20, row: 14, button: 14, pill: 999 });
  });

  it('matches the approved spacing scale', () => {
    expect(tokens.space).toEqual({ 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 });
  });

  it('matches the approved motion durations', () => {
    expect(tokens.motion).toEqual({ press: 120, sheet: 240, page: 300 });
  });

  it('caps elevation to the two approved roles', () => {
    expect(Object.keys(tokens.elevation).sort()).toEqual(['broadcast', 'card']);
  });
});

describe('token discipline', () => {
  const componentsDir = path.join(__dirname, 'components');
  const srcDir = path.join(__dirname, '..');

  it('keeps screens appearance-aware: no hardcoded light or dark palette outside the design system', () => {
    const offenders: string[] = [];
    const visit = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'design-system' || entry.name === 'node_modules') continue;
          visit(full);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.')) {
          if (/tokens\.color\.(light|dark)\./.test(readFileSync(full, 'utf8'))) {
            offenders.push(path.relative(srcDir, full));
          }
        }
      }
    };
    visit(srcDir);

    expect(offenders).toEqual([]);
  });

  it('keeps custom font families out of the app: typography is native per DESIGN.md', () => {
    const offenders: string[] = [];
    const visit = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules') continue;
          visit(full);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.')) {
          if (/fontFamily/.test(readFileSync(full, 'utf8'))) {
            offenders.push(path.relative(srcDir, full));
          }
        }
      }
    };
    visit(srcDir);

    expect(offenders).toEqual([]);
  });

  it('keeps raw hex values out of component source', () => {
    const offenders = readdirSync(componentsDir)
      .filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'))
      .filter((file) => /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(path.join(componentsDir, file), 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('keeps the JSON token export in step with the TypeScript export', () => {
    const json = JSON.parse(readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));

    for (const appearance of APPEARANCES) {
      for (const [dotted, value] of Object.entries(approvedColors[appearance])) {
        const [group, name] = dotted.split('.');
        expect(json.color[appearance][group][name].$value, `json ${appearance} ${dotted}`).toBe(value);
      }
    }

    expect(json.radius.card.$value).toBe(tokens.radius.card);
    expect(json.motion.press.$value).toBe(tokens.motion.press);
  });
});
