import { tokens, type SemanticColors } from './tokens';

/**
 * Accent containers (chips, badges, tinted panels, filled buttons).
 *
 * The approved preview in `docs/design-system-preview/` fills exactly one
 * thing: the primary action. Every other accent is a tinted surface carrying a
 * status or action foreground, so the palette does the work and the component
 * does not decide colour for itself.
 *
 * Ported from the design-system exploration branch on 2026-08-26 and rewritten
 * against the shipped token API. It takes a palette rather than an appearance,
 * so the dark mapping already in `tokens` works the day the appearance switch
 * lands (C-08, issue #11) without touching this file.
 */
export const ACCENT_TONES = [
  'primary',
  'neutral',
  'info',
  'success',
  'warning',
  'danger',
] as const;

export type AccentTone = (typeof ACCENT_TONES)[number];

export type Accent = {
  background: string;
  foreground: string;
  border: string;
};

export function accentFor(
  tone: AccentTone,
  color: SemanticColors = tokens.semantic.color,
): Accent {
  switch (tone) {
    case 'primary':
      return {
        background: color.actionPrimary,
        foreground: color.onPrimary,
        border: color.actionPrimary,
      };
    case 'neutral':
      return {
        background: color.backgroundSurfaceMuted,
        foreground: color.textPrimary,
        border: color.borderSubtle,
      };
    case 'info':
      return {
        background: color.backgroundInfo,
        foreground: color.statusInfo,
        border: color.borderSubtle,
      };
    case 'success':
      return {
        background: color.backgroundSuccess,
        foreground: color.actionPrimary,
        border: color.borderSubtle,
      };
    case 'warning':
      return {
        background: color.backgroundWarning,
        foreground: color.statusWarning,
        border: color.borderSubtle,
      };
    case 'danger':
      return {
        background: color.backgroundDanger,
        foreground: color.statusDanger,
        border: color.borderSubtle,
      };
  }
}
