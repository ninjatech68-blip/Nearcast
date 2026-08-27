import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontFamily, tokens } from '@/design-system/tokens';

/**
 * mono-subtitled list line. rows never own horizontal gestures;
 * that axis belongs to the pager. long-press archives where offered.
 */
export function Row({
  title,
  sub,
  right,
  onPress,
  onLongPress,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const content = (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );

  if (!onPress && !onLongPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: tokens.component.row.minHeight,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.hairlineOnCream,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pressed: { backgroundColor: tokens.semantic.color.pressedOnCream },
  copy: { flex: 1, minWidth: 0 },
  title: { fontFamily: fontFamily.displaySemi, fontSize: 17, letterSpacing: -0.2, color: tokens.semantic.color.ink },
  sub: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 3 },
});
