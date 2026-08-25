import { colorsFor, type Appearance } from './tokens';

/**
 * Accent containers (chips, badges, tinted panels, filled buttons).
 *
 * The approved preview in `docs/design-system-preview/` fills exactly one
 * thing: the primary action. Every other accent is a tinted surface carrying a
 * status or action foreground, and it resolves to the same token in both
 * appearances — the palette itself already differs per appearance.
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

export function accentFor(appearance: Appearance, tone: AccentTone): Accent {
  const color = colorsFor(appearance);

  switch (tone) {
    case 'primary':
      return {
        background: color.action.primary,
        foreground: color.on.primary,
        border: color.action.primary,
      };
    case 'neutral':
      return {
        background: color.background.surfaceMuted,
        foreground: color.text.primary,
        border: color.border.subtle,
      };
    case 'info':
      return {
        background: color.background.info,
        foreground: color.status.info,
        border: color.border.subtle,
      };
    case 'success':
      return {
        background: color.background.success,
        foreground: color.action.primary,
        border: color.border.subtle,
      };
    case 'warning':
      return {
        background: color.background.warning,
        foreground: color.status.warning,
        border: color.border.subtle,
      };
    case 'danger':
      return {
        background: color.background.danger,
        foreground: color.status.danger,
        border: color.border.subtle,
      };
  }
}
