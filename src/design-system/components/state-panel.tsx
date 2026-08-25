import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { accentFor, type AccentTone } from '@/design-system/accents';
import { useAppearance } from '@/design-system/appearance';
import { tokens } from '@/design-system/tokens';

import { Button, type ButtonVariant } from './button';

export const STATE_PANEL_STATES = [
  'loading',
  'empty',
  'offline',
  'restricted',
  'error',
  'success',
  'disabled',
] as const;

export type StatePanelState = (typeof STATE_PANEL_STATES)[number];

/**
 * Retry is recovery, not destruction: error and offline panels keep danger for
 * the message and give the action outline recovery styling.
 */
const PRESENTATION: Record<StatePanelState, { tone: AccentTone; action: ButtonVariant }> = {
  loading: { tone: 'neutral', action: 'outline' },
  empty: { tone: 'neutral', action: 'primary' },
  offline: { tone: 'warning', action: 'outline' },
  restricted: { tone: 'info', action: 'primary' },
  error: { tone: 'dangerMuted', action: 'outline' },
  success: { tone: 'success', action: 'primary' },
  disabled: { tone: 'neutral', action: 'primary' },
};

type StatePanelProps = {
  state: StatePanelState;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  /** Required by the `disabled` state so the panel always explains itself. */
  reason?: string;
};

/** The shared surface for loading, empty, offline, restricted, error, and success states. */
export function StatePanel({ state, title, description, action, reason }: StatePanelProps) {
  const { tone, action: actionVariant } = PRESENTATION[state];
  const accent = accentFor(useAppearance(), tone);
  const detail = state === 'disabled' ? (reason ?? description) : description;

  return (
    <View style={[styles.panel, { backgroundColor: accent.background, borderColor: accent.border }]}>
      {state === 'loading' ? <ActivityIndicator color={accent.foreground} /> : null}
      <Text
        accessibilityRole={state === 'error' ? 'alert' : 'header'}
        accessibilityState={{ busy: state === 'loading', disabled: state === 'disabled' }}
        style={[styles.title, { color: accent.foreground }]}>
        {title}
      </Text>
      {detail ? <Text style={[styles.detail, { color: accent.foreground }]}>{detail}</Text> : null}
      {action ? (
        <Button
          disabled={state === 'disabled'}
          label={action.label}
          onPress={action.onPress}
          unavailableReason={reason}
          variant={actionVariant}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  detail: { ...tokens.type.caption },
  panel: {
    alignItems: 'flex-start',
    borderRadius: tokens.component.intentCard.radius,
    borderWidth: StyleSheet.hairlineWidth,
    gap: tokens.component.intentCard.gap,
    padding: tokens.component.intentCard.padding,
  },
  title: { ...tokens.type.sectionTitle },
});
