import { describe, expect, it } from 'vitest';

import { CATEGORIES, category, polesFor, tokens } from './tokens';

describe('design tokens', () => {
  it('keeps every interactive target at least 44 points', () => {
    expect(tokens.component.bar.height).toBeGreaterThanOrEqual(44);
    expect(tokens.component.quiet.minHeight).toBeGreaterThanOrEqual(44);
    expect(tokens.component.dock.control).toBeGreaterThanOrEqual(44);
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
