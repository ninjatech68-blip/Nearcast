import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/design-system/tokens';
import type { IntentStatus } from '@/features/intents/domain/lifecycle';
import {
  availableOwnerActions,
  describeStatus,
  type OwnerAction,
} from '@/features/intents/manage/domain/owner-actions';

const ACTION_LABELS: Record<OwnerAction, string> = {
  edit: 'Edit',
  withdraw: 'Withdraw',
  resolve: 'Mark resolved',
  duplicate: 'Duplicate',
};

/**
 * `IntentStatusHeader`. Shows the intent's current state and only the owner
 * actions that state actually permits, so a control the server would refuse is
 * never rendered.
 */
export function IntentStatusHeader({
  status,
  onAction,
  busyAction = null,
}: {
  status: IntentStatus;
  onAction: (action: OwnerAction) => void;
  busyAction?: OwnerAction | null;
}) {
  const actions = availableOwnerActions(status);

  return (
    <View style={styles.container}>
      <Text accessibilityLabel="Intent status" style={styles.status}>
        {describeStatus(status)}
      </Text>

      {actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ACTION_LABELS[action]}
              accessibilityState={{ disabled: busyAction !== null }}
              disabled={busyAction !== null}
              key={action}
              onPress={() => onAction(action)}
              style={styles.action}>
              <Text style={styles.actionText}>
                {busyAction === action ? 'Working' : ACTION_LABELS[action]}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.semantic.color.backgroundSurface,
    borderColor: tokens.semantic.color.borderDefault,
    borderRadius: tokens.primitive.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: tokens.primitive.space[3],
    padding: tokens.primitive.space[4],
  },
  status: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.primitive.space[2] },
  action: {
    backgroundColor: tokens.semantic.color.backgroundSubtle,
    borderRadius: tokens.primitive.radius.pill,
    paddingHorizontal: tokens.primitive.space[4],
    paddingVertical: tokens.primitive.space[2],
  },
  actionText: {
    color: tokens.semantic.color.actionPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
  },
});
