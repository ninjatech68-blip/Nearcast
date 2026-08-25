import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/design-system/appearance';
import { tokens } from '@/design-system/tokens';

/** Shown when a stored delivery reason is missing; never a fabricated reason. */
export const MISSING_REASON_COPY = 'Reason unavailable';

type DeliveryReasonRowProps = {
  /** The stored, human-readable delivery reason. */
  reason: string;
  /** Human-readable delivery time, for example `Delivered 2 hours ago`. */
  deliveredAt?: string;
};

/** Renders a stored delivery reason in dashboard and detail contexts. */
export function DeliveryReasonRow({ reason, deliveredAt }: DeliveryReasonRowProps) {
  const color = useColors();
  const trimmed = reason.trim();
  const readable = trimmed.length > 0;

  return (
    <View
      accessibilityRole="text"
      style={[styles.row, { backgroundColor: color.background.info, borderColor: color.border.subtle }]}>
      <Text style={[styles.reason, { color: color.text.secondary }]}>
        {readable ? trimmed : MISSING_REASON_COPY}
      </Text>
      {deliveredAt ? (
        <Text style={[styles.meta, { color: color.text.secondary }]}>{deliveredAt}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { ...tokens.type.caption },
  reason: { ...tokens.type.body },
  row: {
    borderRadius: tokens.component.row.radius,
    borderWidth: StyleSheet.hairlineWidth,
    gap: tokens.space[1],
    justifyContent: 'center',
    minHeight: tokens.component.row.minHeight,
    padding: tokens.component.row.padding,
  },
});
