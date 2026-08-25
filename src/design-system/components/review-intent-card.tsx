import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/design-system/appearance';
import { assertPrivacySafe } from '@/design-system/privacy';
import { tokens } from '@/design-system/tokens';

import { Pill } from './pill';
import { PrivacyHint } from './privacy-hint';

export const REVIEW_HEADING = 'This is exactly what others will see';

type ReviewIntentCardProps = {
  /** The broadcaster's display name as others will see it. */
  broadcasterName: string;
  /** Approximate area only. */
  area: string;
  category: string;
  summary: string;
  /** Human-readable expiry, for example `Expires in 7 hours`. */
  expiry?: string;
};

/**
 * The pre-post preview.
 *
 * It renders only the fields other people receive, and refuses to render an
 * exact location or contact details in any of them. Private contact details,
 * private-group names, and hidden identity fields are not part of its props,
 * so they cannot leak into the preview.
 */
export function ReviewIntentCard({
  broadcasterName,
  area,
  category,
  summary,
  expiry,
}: ReviewIntentCardProps) {
  for (const [field, value] of [
    ['Broadcaster name', broadcasterName],
    ['Area', area],
    ['Category', category],
    ['Summary', summary],
  ] as const) {
    assertPrivacySafe(field, value);
  }

  const color = useColors();

  return (
    <View style={styles.wrapper}>
      <Text accessibilityRole="header" style={[styles.heading, { color: color.text.primary }]}>
        {REVIEW_HEADING}
      </Text>

      <View
        style={[
          styles.preview,
          { backgroundColor: color.background.surface, borderColor: color.border.subtle },
        ]}>
        <Text style={[styles.name, { color: color.text.primary }]}>{broadcasterName}</Text>
        <View style={styles.meta}>
          <Pill label={area} />
          <Pill label={category} />
        </View>
        <Text style={[styles.summary, { color: color.text.primary }]}>{summary}</Text>
        {expiry ? (
          <Text style={[styles.expiry, { color: color.text.secondary }]}>{expiry}</Text>
        ) : null}
      </View>

      <PrivacyHint />
    </View>
  );
}

const styles = StyleSheet.create({
  expiry: { ...tokens.type.caption },
  heading: { ...tokens.type.sectionTitle },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  name: { ...tokens.type.bodyStrong },
  preview: {
    borderRadius: tokens.component.intentCard.radius,
    borderWidth: StyleSheet.hairlineWidth,
    gap: tokens.component.intentCard.gap,
    padding: tokens.component.intentCard.padding,
  },
  summary: { ...tokens.type.body },
  wrapper: { gap: tokens.component.intentCard.gap },
});
