import { describe, expect, it } from 'vitest';

import { ACCENT_TONES, accentFor } from './accents';
import { tokens } from './tokens';

describe('accents', () => {
  it('fills only the primary action', () => {
    const primary = accentFor('primary');
    expect(primary.background).toBe(tokens.semantic.color.actionPrimary);
    expect(primary.foreground).toBe(tokens.semantic.color.onPrimary);

    const tinted = ACCENT_TONES.filter((tone) => tone !== 'primary').map((tone) =>
      accentFor(tone),
    );
    for (const accent of tinted) {
      expect(accent.background).not.toBe(tokens.semantic.color.actionPrimary);
    }
  });

  it('gives every tone a background, a foreground and a border', () => {
    for (const tone of ACCENT_TONES) {
      const accent = accentFor(tone);
      expect(accent.background).toMatch(/^#/);
      expect(accent.foreground).toMatch(/^#/);
      expect(accent.border).toMatch(/^#/);
    }
  });

  it('resolves against the dark palette without changing the component', () => {
    for (const tone of ACCENT_TONES) {
      const light = accentFor(tone);
      const dark = accentFor(tone, tokens.semanticDark.color);
      expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
      expect(dark.background).toMatch(/^#/);
    }
  });
});
