import { Pressable, StyleSheet, Text } from 'react-native';

import { useColors } from '@/design-system/appearance';
import { isInteractionBlocked, resolveComponentState } from '@/design-system/state';
import { tokens } from '@/design-system/tokens';

/** Shown whenever choosing an option would widen who can see an intent. */
export const CONSENT_COPY = 'Choosing this expands who can see your intent.';

type ReachOptionCardProps = {
  title: string;
  /** Who can see the intent at this reach, in plain language. */
  audience: string;
  /** What this reach means for privacy. */
  privacyConsequence: string;
  selected: boolean;
  onSelect: () => void;
  /** Marks an option that widens reach beyond the current selection. */
  expandsReach?: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

/**
 * A single reach choice.
 *
 * Reach only ever changes because someone pressed this card, and an option
 * that widens reach says so before it is chosen.
 */
export function ReachOptionCard({
  title,
  audience,
  privacyConsequence,
  selected,
  onSelect,
  expandsReach = false,
  disabled = false,
  disabledReason,
}: ReachOptionCardProps) {
  const color = useColors();
  const state = resolveComponentState({ disabled, selected });
  const blocked = isInteractionBlocked(state);

  return (
    <Pressable
      accessibilityHint={
        [privacyConsequence, expandsReach ? CONSENT_COPY : null, disabled ? disabledReason : null]
          .filter(Boolean)
          .join(' ') || undefined
      }
      accessibilityLabel={`${title}. ${audience}`}
      accessibilityRole="radio"
      accessibilityState={{ disabled, selected }}
      disabled={blocked}
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: color.background.surface,
          borderColor: selected ? color.action.primary : color.border.subtle,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
        },
        pressed && !blocked && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text style={[styles.title, { color: color.text.primary }]}>{title}</Text>
      <Text style={[styles.audience, { color: color.text.secondary }]}>{audience}</Text>
      <Text style={[styles.consequence, { color: color.text.secondary }]}>{privacyConsequence}</Text>
      {expandsReach ? (
        <Text style={[styles.consent, { color: color.status.warning }]}>{CONSENT_COPY}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  audience: { ...tokens.type.body },
  card: {
    borderRadius: tokens.component.intentCard.radius,
    gap: tokens.space[1],
    minHeight: tokens.component.row.minHeight,
    padding: tokens.component.intentCard.padding,
  },
  consent: { ...tokens.type.caption },
  consequence: { ...tokens.type.caption },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.88 },
  title: { ...tokens.type.bodyStrong },
});
