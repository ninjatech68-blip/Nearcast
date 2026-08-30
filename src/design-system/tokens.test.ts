import { describe, expect, it } from 'vitest';

import { CATEGORIES, category, polesFor, tokens } from './tokens';

/** WCAG 2.1 relative luminance, so the colour rules are checked not asserted. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('design tokens', () => {
  it('keeps every interactive target at least 44 points', () => {
    expect(tokens.component.bar.height).toBeGreaterThanOrEqual(44);
    expect(tokens.component.quiet.minHeight).toBeGreaterThanOrEqual(44);
    expect(tokens.component.dock.control).toBeGreaterThanOrEqual(44);
    expect(tokens.component.minTarget).toBe(44);
  });

  it('keeps every category foreground legible on its own field', () => {
    // The dock has no surface: its marks sit straight on the poster in
    // that field's declared foreground. So this is not a nicety — it is
    // the property the whole bar depends on, and an eleventh category
    // with a pretty field and the wrong pole would make navigation
    // disappear on exactly the screens showing it.
    for (const id of CATEGORIES) {
      expect(contrast(category[id].fg, category[id].field)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the selected mark legible, which accent as a foreground would not be', () => {
    const { accent, ink } = tokens.semantic.color;
    // the design system's selected state is an accent pill with ink on
    // it, and this is why: accent as a foreground is 1.00:1 on the social
    // field, because the social field IS the accent.
    expect(contrast(accent, category.social.field)).toBeLessThan(1.1);
    expect(contrast(ink, accent)).toBeGreaterThanOrEqual(4.5);
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

  it('keeps a poster clear of the compose button, not just of the dock', () => {
    // the reserve is measured from the screen bottom; the compose button
    // is centred on the icon-and-label block, so its top sits ABOVE the
    // control row's own top by (control - cast.top - cast.size). at the
    // old 96 it cut into the poster's call-to-action.
    const { dock, posterBottomReserve } = tokens.component;
    const homeIndicator = 34;
    const composeTopFromBottom = homeIndicator + dock.control - dock.cast.top;
    expect(posterBottomReserve).toBeGreaterThan(composeTopFromBottom);
  });

  it('puts the dock label line below the icons it labels', () => {
    const { dock } = tokens.component;
    expect(dock.labelTop).toBeGreaterThanOrEqual(dock.iconTop + dock.icon);
    // and the whole block still fits the control row
    expect(dock.labelTop + tokens.typography.tagSmall.lineHeight).toBeLessThanOrEqual(dock.control);
  });
});
