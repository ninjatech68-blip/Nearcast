import { colorsFor, type Appearance } from './tokens';

/**
 * Accent containers (chips, badges, tinted panels, filled buttons).
 *
 * The light appearance fills info, secondary, and danger accents with a
 * saturated colour and sets type on top; the dark appearance keeps those
 * accents as tinted surfaces instead. Encoding that asymmetry once here stops
 * every component from re-deriving it.
 */
export const ACCENT_TONES = [
  'primary',
  'secondary',
  'neutral',
  'info',
  'success',
  'warning',
  'danger',
  'dangerMuted',
] as const;

export type AccentTone = (typeof ACCENT_TONES)[number];

export type Accent = {
  background: string;
  foreground: string;
  border: string;
};

export function accentFor(appearance: Appearance, tone: AccentTone): Accent {
  const color = colorsFor(appearance);
  const filled = appearance === 'light';

  switch (tone) {
    case 'primary':
      return {
        background: color.action.primary,
        foreground: color.on.primary,
        border: color.action.primary,
      };
    case 'secondary':
      return filled
        ? {
            background: color.action.secondary,
            foreground: color.on.info,
            border: color.action.secondary,
          }
        : {
            background: color.background.info,
            foreground: color.action.secondary,
            border: color.border.subtle,
          };
    case 'danger':
      return filled
        ? {
            background: color.status.danger,
            foreground: color.on.danger,
            border: color.status.danger,
          }
        : {
            background: color.background.danger,
            foreground: color.status.danger,
            border: color.border.subtle,
          };
    case 'dangerMuted':
      return {
        background: color.background.danger,
        foreground: color.status.danger,
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
        foreground: color.on.success,
        border: color.border.subtle,
      };
    case 'warning':
      return {
        background: color.background.warning,
        foreground: color.on.warning,
        border: color.border.subtle,
      };
    case 'neutral':
      return {
        background: color.background.surfaceMuted,
        foreground: color.text.primary,
        border: color.border.subtle,
      };
  }
}
