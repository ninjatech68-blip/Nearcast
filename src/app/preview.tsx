import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/design-system/tokens';
import { Button } from '@/design-system/components/button';
import { Group, PrimitiveChip, Section, SymbolIcon } from '@/features/native-demo/native-ui';

const reachLevels = [
  ['Trusted circles', 'People you are connected to'],
  ['Adjacent network', 'People connected to your network'],
  ['Relevant nearby', 'People near you with shared context'],
  ['Broader approved', 'People in approved neighborhoods'],
] as const;

export default function PreviewIntentScreen() {
  const { primitive = 'request', statement = '' } = useLocalSearchParams<{ primitive?: string; statement?: string }>();
  const primitiveLabel = primitive === 'offer' ? 'I offer' : primitive === 'plan' ? 'I want to' : 'I need';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>Review</Text>

      <Section>
        <Group>
          <View style={styles.previewCard}>
            <PrimitiveChip label={primitiveLabel} />
            <Text style={styles.statement}>{statement || 'Your intent preview will appear here.'}</Text>
            <View style={styles.expiryRow}>
              <SymbolIcon fallback="E" name="clock" size={16} />
              <Text style={styles.meta}>Expires today, 10:00 PM</Text>
            </View>
          </View>
        </Group>
      </Section>

      <Section title="Who can see this?">
        <Group>
          {reachLevels.map(([title, body], index) => {
            const selected = title === 'Adjacent network';
            return (
              <View key={title}>
                <View style={styles.reachRow}>
                  <View style={styles.reachCopy}>
                    <Text style={styles.reachTitle}>{title}</Text>
                    <Text style={styles.reachBody}>{body}</Text>
                  </View>
                  <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                </View>
                {index < reachLevels.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            );
          })}
        </Group>
      </Section>

      <View style={styles.footer}>
        <Button label="Broadcast intent" onPress={() => undefined} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 20, backgroundColor: tokens.semantic.color.backgroundCanvas },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 17, lineHeight: 23, textAlign: 'center', color: tokens.semantic.color.textPrimary },
  previewCard: { gap: 12, padding: 14 },
  statement: { fontFamily: 'Manrope_700Bold', fontSize: 18, lineHeight: 24, color: tokens.semantic.color.textPrimary },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { fontFamily: 'Manrope_400Regular', fontSize: 13, color: tokens.semantic.color.textMuted },
  reachRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12 },
  reachCopy: { flex: 1 },
  reachTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  reachBody: { marginTop: 2, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18, color: tokens.semantic.color.textMuted },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: tokens.semantic.color.actionPrimary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: tokens.semantic.color.actionPrimary },
  divider: { height: 1, marginLeft: 14, backgroundColor: tokens.semantic.color.borderDefault },
  footer: { marginTop: 'auto', paddingTop: 24 },
});
