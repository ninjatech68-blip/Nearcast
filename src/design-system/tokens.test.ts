import { describe, expect, it } from 'vitest';

import { tokens } from './tokens';

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
