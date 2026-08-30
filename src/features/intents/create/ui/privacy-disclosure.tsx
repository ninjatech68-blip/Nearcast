import { StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/design-system/tokens';
import type { DisclosureItem } from '@/features/intents/create/domain/draft';

/**
 * `PrivacyDisclosure` per the Mobile Screen Contracts component API: it
 * receives `visibleNow` and `visibleAfterAction`.
 *
 * `heldBack` is an addition. The contract's two lists say what becomes visible,
 * but the stronger promise in Trust, Privacy and Safety is about what does not,
 * and a person cannot trust a boundary they cannot see. It names the private
 * fields being withheld without restating their contents.
 */
export function PrivacyDisclosure({
  visibleNow,
  visibleAfterAction,
  heldBack = [],
  actionLabel,
}: {
  visibleNow: DisclosureItem[];
  visibleAfterAction: DisclosureItem[];
  heldBack?: DisclosureItem[];
  actionLabel: string;
}) {
  return (
    <View accessibilityLabel="What others can see" style={styles.container}>
      <Section
        title="Visible now"
        emptyCopy="Nothing yet. This draft is only on your device."
        items={visibleNow}
      />
      <Section title={`Visible after you ${actionLabel}`} items={visibleAfterAction} />
      {heldBack.length > 0 && (
        <Section title="Stays private" items={heldBack} tone="private" />
      )}
    </View>
  );
}

function Section({
  title,
  items,
  emptyCopy,
  tone = 'default',
}: {
  title: string;
  items: DisclosureItem[];
  emptyCopy?: string;
  tone?: 'default' | 'private';
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {items.length === 0 && emptyCopy !== undefined && (
        <Text style={styles.empty}>{emptyCopy}</Text>
      )}

      {items.map((item) => (
        <View key={`${title}:${item.label}:${item.detail}`} style={styles.row}>
          <Text style={[styles.label, tone === 'private' && styles.labelPrivate]}>
            {item.label}
          </Text>
          <Text style={styles.detail}>{item.detail}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.semantic.color.backgroundSurface,
    borderColor: tokens.semantic.color.borderDefault,
    borderRadius: tokens.primitive.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: tokens.primitive.space[4],
    padding: tokens.primitive.space[4],
  },
  section: { gap: tokens.primitive.space[1] },
  sectionTitle: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
  },
  empty: {
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
  },
  row: { marginTop: tokens.primitive.space[1] },
  label: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
  },
  labelPrivate: { color: tokens.semantic.color.trustText },
  detail: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.body.fontSize,
    lineHeight: tokens.typography.body.lineHeight,
  },
});
