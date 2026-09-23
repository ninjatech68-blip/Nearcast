import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { Icon } from './icon';

type ReasonLineProps = {
  reason: string;
  onNotForMe?: () => void;
  /** `box` on the plan card, `inline` in list rows. */
  variant?: 'inline' | 'box';
};

/** "Why you're seeing this" (06 §8). Every plan that reaches someone must show one. */
export function ReasonLine({ reason, onNotForMe, variant = 'inline' }: ReasonLineProps) {
  const { colors, tokens } = useTheme();
  if (!reason.trim()) throw new Error('ReasonLine requires a reason');
  const text = variant === 'box' ? `Why you're seeing this: ${reason}` : reason;
  return (
    <View
      style={[
        styles.row,
        variant === 'box' && [styles.box, { backgroundColor: colors.backgroundReason, borderRadius: tokens.radius.row }],
      ]}>
      <Icon color="textReason" label={null} name="reason" size={14} />
      <Text style={[tokens.type.caption, styles.text, { color: colors.textReason }]}>{text}</Text>
      {onNotForMe ? (
        <Pressable accessibilityRole="button" hitSlop={12} onPress={onNotForMe}>
          <Text style={[tokens.type.caption, { color: colors.textSecondary }]}>Not for me</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  box: { padding: 12 },
  text: { flex: 1 },
});
