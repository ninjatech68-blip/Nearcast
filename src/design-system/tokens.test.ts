import { describe, expect, it } from 'vitest';

import { tokens } from './tokens';

function channel(value: number) {
  const ratio = value / 255;
  return ratio <= 0.03928 ? ratio / 12.92 : Math.pow((ratio + 0.055) / 1.055, 2.4);
}

function relativeLuminance(color: string) {
  const value = Number.parseInt(color.slice(1), 16);
  const red = channel((value >> 16) & 255);
  const green = channel((value >> 8) & 255);
  const blue = channel(value & 255);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground: string, background: string) {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

describe('text contrast', () => {
  const grounds = [
    tokens.semantic.color.backgroundSurface,
    tokens.semantic.color.backgroundCanvas,
    tokens.semantic.color.backgroundSubtle,
  ];

  // PRODUCT.md commits to minimum contrast, and doc 15 requires text
  // alternatives to carry the same weight as colour. Every ink token that
  // renders body copy must clear WCAG AA on every ground it can land on.
  const inks = [
    ['textPrimary', tokens.semantic.color.textPrimary],
    ['textSecondary', tokens.semantic.color.textSecondary],
    ['textMuted', tokens.semantic.color.textMuted],
  ] as const;

  for (const [name, ink] of inks) {
    for (const ground of grounds) {
      it(`keeps ${name} readable on ${ground}`, () => {
        expect(contrastRatio(ink, ground)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('keeps the trust pill readable on its own surface', () => {
    expect(
      contrastRatio(tokens.semantic.color.trustText, tokens.semantic.color.trustSurface),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps muted text visibly lighter than secondary text', () => {
    const muted = contrastRatio(
      tokens.semantic.color.textMuted,
      tokens.semantic.color.backgroundCanvas,
    );
    const secondary = contrastRatio(
      tokens.semantic.color.textSecondary,
      tokens.semantic.color.backgroundCanvas,
    );
    expect(muted).toBeLessThan(secondary);
  });
});

describe('design tokens', () => {
  it('maps component colors through semantic values', () => {
    expect(tokens.component.button.primary.background).toBe(
      tokens.semantic.color.actionPrimary,
    );
    expect(tokens.component.intentCard.background).toBe(
      tokens.semantic.color.backgroundSurface,
    );
  });

  it('keeps every interactive target at least 48 points high', () => {
    expect(tokens.component.button.height).toBeGreaterThanOrEqual(48);
    expect(tokens.component.input.minHeight).toBeGreaterThanOrEqual(48);
  });
});
