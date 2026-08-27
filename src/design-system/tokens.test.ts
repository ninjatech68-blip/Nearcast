import { describe, expect, it } from 'vitest';

import { tokens, verbColor, verbForeground } from './tokens';

describe('design tokens', () => {
  it('keeps every interactive target at least 44 points', () => {
    expect(tokens.component.bar.height).toBeGreaterThanOrEqual(44);
    expect(tokens.component.quiet.minHeight).toBeGreaterThanOrEqual(44);
    expect(tokens.component.rail.height).toBeGreaterThanOrEqual(44);
    expect(tokens.component.minTarget).toBe(44);
  });

  it('pairs ink type with yellow and orange fields, cream type with green', () => {
    expect(verbForeground.need).toBe(tokens.primitive.color.ink);
    expect(verbForeground.lets).toBe(tokens.primitive.color.ink);
    expect(verbForeground.got).toBe(tokens.primitive.color.cream);
  });

  it("maps LET'S to the accent so the brand color and the plan verb stay one thing", () => {
    expect(verbColor.lets).toBe(tokens.semantic.color.accent);
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
