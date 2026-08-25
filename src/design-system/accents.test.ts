import { describe, expect, it } from 'vitest';

import { ACCENT_TONES, accentFor, type Accent, type AccentTone } from './accents';
import { APPEARANCES, colorsFor } from './tokens';

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

describe('accent recipes', () => {
  it.each(APPEARANCES)('keeps every %s accent readable at WCAG AA', (appearance) => {
    for (const tone of ACCENT_TONES) {
      const accent = accentFor(appearance, tone);

      expect(
        contrastRatio(accent.foreground, accent.background),
        `${appearance} ${tone}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(APPEARANCES)('only uses %s colours that exist in the palette', (appearance) => {
    const palette = new Set(
      Object.values(colorsFor(appearance)).flatMap((group) => Object.values(group)),
    );

    for (const tone of ACCENT_TONES) {
      const accent = accentFor(appearance, tone);

      for (const [role, value] of Object.entries(accent)) {
        expect(palette.has(value), `${appearance} ${tone} ${role} (${value})`).toBe(true);
      }
    }
  });

  it('fills the primary action and nothing else', () => {
    for (const appearance of APPEARANCES) {
      const color = colorsFor(appearance);
      const filled = ACCENT_TONES.filter((tone) => {
        const { background } = accentFor(appearance, tone);
        return !Object.values(color.background).includes(background);
      });

      expect(filled, appearance).toEqual(['primary']);
    }
  });

  it('resolves every tone to the same token roles in both appearances', () => {
    const expected: Record<AccentTone, Record<keyof Accent, string>> = {
      primary: {
        background: 'action.primary',
        foreground: 'on.primary',
        border: 'action.primary',
      },
      neutral: {
        background: 'background.surfaceMuted',
        foreground: 'text.primary',
        border: 'border.subtle',
      },
      info: { background: 'background.info', foreground: 'status.info', border: 'border.subtle' },
      success: {
        background: 'background.success',
        foreground: 'action.primary',
        border: 'border.subtle',
      },
      warning: {
        background: 'background.warning',
        foreground: 'status.warning',
        border: 'border.subtle',
      },
      danger: {
        background: 'background.danger',
        foreground: 'status.danger',
        border: 'border.subtle',
      },
    };

    for (const appearance of APPEARANCES) {
      const scheme = colorsFor(appearance) as unknown as Record<string, Record<string, string>>;
      const read = (dotted: string): string => {
        const [group, name] = dotted.split('.');
        return scheme[group][name];
      };

      for (const tone of ACCENT_TONES) {
        expect(accentFor(appearance, tone), `${appearance} ${tone}`).toEqual({
          background: read(expected[tone].background),
          foreground: read(expected[tone].foreground),
          border: read(expected[tone].border),
        });
      }
    }
  });
});
