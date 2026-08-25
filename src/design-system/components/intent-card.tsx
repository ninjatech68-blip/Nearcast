import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/design-system/appearance';
import { assertPrivacySafe } from '@/design-system/privacy';
import { tokens } from '@/design-system/tokens';

import { Button } from './button';
import { Pill } from './pill';
import { TrustBadge } from './trust-badge';
import { WhyShownChip } from './why-shown-chip';

export const INTENT_CARD_STATUSES = ['expired', 'withdrawn', 'reported'] as const;

export type IntentCardStatus = (typeof INTENT_CARD_STATUSES)[number];

const STATUS_COPY: Record<IntentCardStatus, { pill: string; reason: string }> = {
  expired: { pill: 'Expired', reason: 'This intent has expired.' },
  withdrawn: { pill: 'Withdrawn', reason: 'The broadcaster withdrew this intent.' },
  reported: { pill: 'Reported', reason: 'This intent is under review.' },
};

type IntentCardProps = {
  broadcaster: { name: string; context?: string };
  trust: { score: number; band: string; verifiedSignal?: string };
  /** Approximate area only, for example `Indiranagar area`. */
  area: string;
  category: string;
  /** A one-line intent summary. */
  summary: string;
  /** The stored, human-readable delivery reason. */
  reason: string;
  onWhyShown?: () => void;
  action?: { label: string; onPress: () => void };
  onSave?: () => void;
  saved?: boolean;
  status?: IntentCardStatus;
  restricted?: boolean;
  restrictedReason?: string;
  offline?: boolean;
};

/**
 * The delivered intent, in the anatomy set out by DESIGN.md.
 *
 * The card refuses to render an exact location or contact details, and it
 * always carries a reachable delivery reason.
 */
export function IntentCard({
  broadcaster,
  trust,
  area,
  category,
  summary,
  reason,
  onWhyShown,
  action,
  onSave,
  saved = false,
  status,
  restricted = false,
  restrictedReason,
  offline = false,
}: IntentCardProps) {
  assertPrivacySafe('Area', area);
  assertPrivacySafe('Summary', summary);

  const color = useColors();
  const blockedReason = status
    ? STATUS_COPY[status].reason
    : restricted
      ? (restrictedReason ?? 'Sign in to act on this intent.')
      : offline
        ? 'You are offline. This will send when you reconnect.'
        : undefined;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: color.background.surface, borderColor: color.border.subtle },
        tokens.elevation.card,
      ]}>
      <View style={styles.header}>
        <View style={styles.broadcaster}>
          <Text style={[styles.name, { color: color.text.primary }]}>{broadcaster.name}</Text>
          {broadcaster.context ? (
            <Text style={[styles.context, { color: color.text.secondary }]}>
              {broadcaster.context}
            </Text>
          ) : null}
        </View>
        {onSave ? (
          <Pressable
            accessibilityLabel={saved ? 'Saved' : 'Save intent'}
            accessibilityRole="button"
            accessibilityState={{ selected: saved }}
            hitSlop={tokens.space[2]}
            onPress={onSave}
            style={styles.save}>
            <Text style={[styles.saveLabel, { color: color.action.secondary }]}>
              {saved ? 'Saved' : 'Save'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <TrustBadge
        band={trust.band}
        score={trust.score}
        verifiedSignal={trust.verifiedSignal}
      />

      <View style={styles.meta}>
        <Pill label={area} />
        <Pill label={category} tone="neutral" />
        {status ? <Pill label={STATUS_COPY[status].pill} tone="dangerMuted" /> : null}
      </View>

      <Text style={[styles.summary, { color: color.text.primary }]}>{summary}</Text>

      <WhyShownChip onPress={onWhyShown} reason={reason} />

      {action ? (
        <Button
          disabled={Boolean(blockedReason)}
          label={action.label}
          onPress={action.onPress}
          unavailableReason={blockedReason}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  broadcaster: { flexShrink: 1, gap: tokens.space[1] },
  card: {
    borderRadius: tokens.component.intentCard.radius,
    borderWidth: StyleSheet.hairlineWidth,
    gap: tokens.component.intentCard.gap,
    padding: tokens.component.intentCard.padding,
  },
  context: { ...tokens.type.caption },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  name: { ...tokens.type.bodyStrong },
  save: { justifyContent: 'center', minHeight: tokens.touchTarget.ios },
  saveLabel: { ...tokens.type.caption },
  summary: { ...tokens.type.body },
});
