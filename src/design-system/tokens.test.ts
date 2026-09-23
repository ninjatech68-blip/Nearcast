import { describe, expect, it } from 'vitest';

import tokensJson from './tokens.json';
import { categoryTint, contrastRatio, themes, tokens, type ThemeColors } from './tokens';

const TEXT_PAIRS: [keyof ThemeColors, keyof ThemeColors][] = [
  ['textPrimary', 'backgroundApp'],
  ['textPrimary', 'backgroundSurface'],
  ['textPrimary', 'backgroundSurfaceMuted'],
  ['textPrimary', 'backgroundSuccess'],
  ['textPrimary', 'backgroundWarning'],
  ['textSecondary', 'backgroundApp'],
  ['textSecondary', 'backgroundSurface'],
  ['textSecondary', 'backgroundSurfaceMuted'],
  ['onPrimary', 'actionPrimary'],
  ['onPrimary', 'actionPrimaryPressed'],
  ['actionPrimary', 'backgroundSurface'],
  ['actionPrimary', 'backgroundApp'],
  ['actionSecondary', 'backgroundSurface'],
  ['statusInfo', 'backgroundInfo'],
  ['statusInfo', 'backgroundSurface'],
  ['statusWarning', 'backgroundWarning'],
  ['statusDanger', 'backgroundDanger'],
  ['statusDanger', 'backgroundSurface'],
  ['textReason', 'backgroundReason'],
  ['textTrust', 'backgroundTrust'],
];

describe('design tokens', () => {
  it('computes WCAG contrast correctly', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  for (const scheme of ['light', 'dark'] as const) {
    it(`meets WCAG AA (4.5:1) for every text pair in ${scheme}`, () => {
      const failures = TEXT_PAIRS.map(([fg, bg]) => ({
        pair: `${fg} on ${bg}`,
        ratio: contrastRatio(themes[scheme][fg], themes[scheme][bg]),
      })).filter(({ ratio }) => ratio < 4.5);
      expect(failures).toEqual([]);
    });
  }

  it('defines the same colour roles in both themes', () => {
    expect(Object.keys(themes.dark).sort()).toEqual(Object.keys(themes.light).sort());
  });

  it('never uses purple for actions (06 §2.2)', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const { actionPrimary, actionSecondary } = themes[scheme];
      for (const hex of [actionPrimary, actionSecondary]) {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
        expect(r > g && b > g).toBe(false);
      }
    }
  });

  it('has a tint for every interest group in the seed', () => {
    const groups = ['Sport', 'Food & drinks', 'Outdoors', 'Games', 'Culture', 'Learning',
      'Help & favours', 'Nightlife', 'Wellness', 'Rides & travel'];
    for (const group of groups) {
      expect(categoryTint(group, 'light')).toMatch(/^#[0-9A-F]{6}$/);
      expect(categoryTint(group, 'dark')).toMatch(/^#[0-9A-F]{6}$/);
    }
    expect(categoryTint('Unknown group', 'light')).toBe(themes.light.backgroundSurfaceMuted);
  });

  it('keeps touch targets at platform minimums', () => {
    expect(tokens.size.minTouch).toBeGreaterThanOrEqual(44);
    expect(tokens.size.primaryButton).toBeGreaterThanOrEqual(48);
  });

  it('uses the system font for UI and Manrope only for display', () => {
    expect(tokens.type.body.fontFamily).toBeUndefined();
    expect(tokens.type.displayLarge.fontFamily).toBe('Manrope_700Bold');
  });

  it('keeps tokens.json in sync for design tools', () => {
    expect(tokensJson.color.light).toEqual(themes.light);
    expect(tokensJson.color.dark).toEqual(themes.dark);
    expect(tokensJson.radius).toEqual(tokens.radius);
    expect(tokensJson.space).toEqual(tokens.space);
  });
});
