import { describe, expect, it } from 'vitest';

import { CATEGORIES, category, polesFor, tokens } from './tokens';

describe('design tokens', () => {
  it('keeps every interactive target at least 44 points', () => {
    expect(tokens.component.bar.height).toBeGreaterThanOrEqual(44);
    expect(tokens.component.quiet.minHeight).toBeGreaterThanOrEqual(44);
    expect(tokens.component.rail.height).toBeGreaterThanOrEqual(44);
    expect(tokens.component.minTarget).toBe(44);
  });

  it('gives all ten categories a field and a declared ink-or-cream foreground', () => {
    expect(CATEGORIES).toHaveLength(10);
    for (const id of CATEGORIES) {
      const spec = category[id];
      expect(spec.field).toMatch(/^#[0-9A-F]{6}$/i);
      expect([tokens.primitive.color.ink, tokens.primitive.color.cream]).toContain(spec.fg);
      expect(spec.label.length).toBeGreaterThan(0);
    }
  });

  it('keeps social on brand orange so the people category is the brand', () => {
    expect(category.social.field).toBe(tokens.semantic.color.accent);
  });

  it('poles a pill to the opposite of its field foreground, so it reads as a control', () => {
    // ink-type fields (sports yellow) get an ink pill with cream text
    expect(polesFor('sports')).toEqual({
      pillBg: tokens.primitive.color.ink,
      pillFg: tokens.primitive.color.cream,
    });
    // cream-type fields (music ink) flip
    expect(polesFor('music')).toEqual({
      pillBg: tokens.primitive.color.cream,
      pillFg: tokens.primitive.color.ink,
    });
  });

  it('caps a cast at one breath', () => {
    expect(tokens.component.field.maxLength).toBe(140);
    expect(tokens.component.field.warnAt).toBeLessThan(tokens.component.field.maxLength);
  });

  it('reserves poster bottom space for the rail', () => {
    expect(tokens.component.posterBottomReserve).toBeGreaterThanOrEqual(
      tokens.component.rail.height + tokens.component.rail.bottomOffset,
    );
  });
});
