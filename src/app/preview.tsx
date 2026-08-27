import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { INTENT_REACH_LEVELS, type IntentReachLevel } from '@/features/intents/domain/intent';
import { reachLevels } from '@/features/native-demo/nearcast-fixtures';
import {
  DividerHairline,
  Group,
  PrimitiveChip,
  ProgressBar,
  Section,
  StatusBanner,
  SymbolIcon,
  TopBar,
} from '@/features/native-demo/native-ui';

const labelForPrimitive: Record<string, string> = {
  request: 'I need',
  offer: 'I offer',
  plan: 'I want to',
};

export default function PreviewIntentScreen() {
  const params = useLocalSearchParams<{ primitive?: string; statement?: string; area?: string; time?: string }>();
  const primitive = params.primitive ?? 'plan';
  const statement = params.statement ?? '';
  const area = params.area || 'Add later';
  const time = params.time || 'Expires today, 10:00 PM';

  const [reach, setReach] = useState<IntentReachLevel>('adjacent_network');
  const [broadcasting, setBroadcasting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  function broadcast() {
    setError(undefined);
    setBroadcasting(true);
    setTimeout(() => {
      setBroadcasting(false);
      router.replace('/(tabs)/my-intents');
    }, 700);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <TopBar title="Review intent" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <ProgressBar steps={2} currentStep={2} />

        <Section>
          <Group>
            <View style={styles.previewCard}>
              <PrimitiveChip label={labelForPrimitive[primitive] ?? 'I want to'} />
              <Text style={styles.statement}>{statement || 'Your intent preview will appear here.'}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <SymbolIcon color={tokens.semantic.color.textSecondary} fallback="📍" name="mappin.and.ellipse" size={15} />
                  <Text style={styles.metaText}>{area}</Text>
                </View>
                <View style={styles.metaItem}>
                  <SymbolIcon color={tokens.semantic.color.textSecondary} fallback="⏱" name="clock" size={15} />
                  <Text style={styles.metaText}>{time}</Text>
                </View>
              </View>
            </View>
          </Group>
        </Section>

        <Section title="Who can see this?">
          <Group>
            {reachLevels.map((level, index) => {
              const selected = level.value === reach;
              return (
                <View key={level.value}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={level.title}
                    onPress={() => setReach(level.value as IntentReachLevel)}
                    style={styles.reachRow}
                  >
                    <View style={styles.reachCopy}>
                      <Text style={styles.reachTitle}>{level.title}</Text>
                      <Text style={styles.reachBody}>{level.body}</Text>
                    </View>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                  {index < reachLevels.length - 1 ? <DividerHairline inset={14} /> : null}
                </View>
              );
            })}
          </Group>
          {!INTENT_REACH_LEVELS.includes(reach) ? (
            <Text style={styles.helpText}>Choose one option to continue.</Text>
          ) : null}
        </Section>

        <Section>
          <StatusBanner
            tone="trust"
            title="Contact stays hidden"
            body="People will see your first name and area. Exact place and contact appear only after mutual acceptance."
            icon="lock"
            fallback="🔒"
          />
        </Section>

        {error ? (
          <Section>
            <StatusBanner tone="danger" title="Couldn’t broadcast" body={error} icon="exclamationmark.triangle" fallback="!" />
          </Section>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label="Broadcast intent"
          onPress={broadcast}
          loading={broadcasting}
          disabled={!statement}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { padding: 18, paddingBottom: 12 },
  previewCard: { padding: 16, gap: 10 },
  statement: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: tokens.semantic.color.textPrimary,
  },
  metaRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: 'Manrope_400Regular', fontSize: 12, color: tokens.semantic.color.textSecondary },

  reachRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reachCopy: { flex: 1 },
  reachTitle: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: tokens.semantic.color.textPrimary },
  reachBody: { marginTop: 3, fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 17, color: tokens.semantic.color.textMuted },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: tokens.semantic.color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: tokens.semantic.color.actionPrimary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: tokens.semantic.color.actionPrimary },

  helpText: { marginTop: 8, fontFamily: 'Manrope_400Regular', fontSize: 12, color: tokens.semantic.color.dangerText },

  footer: {
    padding: 18,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.borderTabs,
    backgroundColor: tokens.semantic.color.backgroundSurface,
  },
});
