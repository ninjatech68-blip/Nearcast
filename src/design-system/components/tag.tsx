import { StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/design-system/tokens';

type TagTone = 'hot' | 'ok' | 'dim' | 'line';

/** mono caps chip for verbs and states. */
export function Tag({ label, tone = 'line', color }: { label: string; tone?: TagTone; color?: string }) {
  return (
    <View style={[styles.base, styles[tone]]}>
      <Text style={[styles.text, textStyles[tone], color ? { color } : null]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: tokens.primitive.radius.tag, alignSelf: 'flex-start' },
  hot: { backgroundColor: tokens.semantic.color.accent },
  ok: { backgroundColor: tokens.semantic.color.verbGot },
  dim: { backgroundColor: tokens.semantic.color.hairlineOnCream },
  line: { paddingHorizontal: 0, paddingVertical: 6 },
  text: { ...tokens.typography.tagSmall, textTransform: 'uppercase' },
});

const textStyles = StyleSheet.create({
  hot: { color: tokens.semantic.color.ink },
  ok: { color: tokens.semantic.color.cream },
  dim: { color: tokens.semantic.color.textMutedOnCream },
  line: { color: tokens.semantic.color.textMutedOnCream },
});
