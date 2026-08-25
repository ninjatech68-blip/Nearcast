import { describe, expect, it } from 'vitest';

import { tokens } from './tokens';

describe('design tokens', () => {
  it('implements the approved Trustworthy Native Clarity light palette', () => {
    expect(tokens.semantic.color.backgroundApp).toBe('#F7F3EA');
    expect(tokens.semantic.color.backgroundSurface).toBe('#FFFFFF');
    expect(tokens.semantic.color.actionPrimary).toBe('#0F5E46');
    expect(tokens.semantic.color.actionPrimaryPressed).toBe('#0A4936');
    expect(tokens.semantic.color.actionSecondary).toBe('#17324D');
    expect(tokens.semantic.color.borderSubtle).toBe('#DDD6C8');
    expect(tokens.semantic.color.textPrimary).toBe('#16231F');
  });

  it('uses the approved shape and motion values', () => {
    expect(tokens.primitive.radius.card).toBe(20);
    expect(tokens.primitive.radius.button).toBe(14);
    expect(tokens.primitive.radius.row).toBe(14);
    expect(tokens.primitive.motion.press).toBe(120);
    expect(tokens.primitive.motion.sheet).toBe(240);
    expect(tokens.primitive.motion.page).toBe(300);
  });

  it('defines a foreground on-color for every colored surface, per the contract', () => {
    const { color } = tokens.semantic;
    expect(color.onPrimary).toBeTruthy();
    expect(color.onInfo).toBeTruthy();
    expect(color.onWarning).toBeTruthy();
    expect(color.onDanger).toBeTruthy();
    expect(color.onSurface).toBeTruthy();
    expect(color.onSuccess).toBeTruthy();
  });

  it('carries the dark palette with exactly the same semantic keys as light', () => {
    expect(Object.keys(tokens.semanticDark.color).sort()).toEqual(
      Object.keys(tokens.semantic.color).sort(),
    );
    expect(tokens.semanticDark.color.backgroundApp).toBe('#0E1714');
    expect(tokens.semanticDark.color.actionPrimary).toBe('#65D0A1');
  });

  it('maps component colors through semantic values, never raw hex', () => {
    expect(tokens.component.button.primary.background).toBe(tokens.semantic.color.actionPrimary);
    expect(tokens.component.button.primary.foreground).toBe(tokens.semantic.color.onPrimary);
    expect(tokens.component.intentCard.background).toBe(tokens.semantic.color.backgroundSurface);
    expect(tokens.component.intentCard.border).toBe(tokens.semantic.color.borderSubtle);
  });

  it('keeps every interactive target at least 48 points high', () => {
    expect(tokens.component.button.height).toBeGreaterThanOrEqual(48);
    expect(tokens.component.input.minHeight).toBeGreaterThanOrEqual(48);
  });
});
