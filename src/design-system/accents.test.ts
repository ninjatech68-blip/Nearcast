import { describe, expect, it } from 'vitest';

import { ACCENT_TONES, accentFor } from './accents';
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

  it('fills accents in light and tints them in dark', () => {
    expect(accentFor('light', 'danger').background).toBe(colorsFor('light').status.danger);
    expect(accentFor('dark', 'danger').background).toBe(colorsFor('dark').background.danger);
  });
});
