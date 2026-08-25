import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemedStyles } from '@/design-system/appearance';
import { type ColorScheme } from '@/design-system/tokens';
import { broadcaster, featuredIntent } from '@/features/native-demo/nearcast-fixtures';
import { ActionTray, Group, IconLine, PrimitiveChip, PrivacyStrip, ProfileBlock, Section, SymbolIcon, TopBar } from '@/features/native-demo/native-ui';

export default function IntentDetailScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <TopBar title="Intent" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Group>
          <View style={styles.summary}>
            <PrimitiveChip label={featuredIntent.primitive} />
            <Text style={styles.title}>{featuredIntent.title}</Text>
            <Text style={styles.meta}>{featuredIntent.metadata}</Text>
            <View style={styles.expiryPill}>
              <SymbolIcon fallback="E" name="clock" size={16} />
              <Text style={styles.expiryText}>{featuredIntent.expiry}</Text>
            </View>
          </View>
        </Group>

        <Section title="Posted by">
          <Group>
            <ProfileBlock {...broadcaster} onOpen={() => router.push('/profile/aarav')} />
          </Group>
        </Section>

        <Section title="What they need">
          <Group>
            <View style={styles.context}>
              <Text style={styles.body}>{featuredIntent.summary}</Text>
              <View style={styles.chipRow}>
                {featuredIntent.chips.map((chip) => (
                  <View key={chip} style={styles.infoChip}><Text style={styles.infoChipText}>{chip}</Text></View>
                ))}
              </View>
            </View>
          </Group>
        </Section>

        <Section>
          <View style={styles.reasonPanel}>
            <SymbolIcon fallback="W" name="person.2" size={28} />
            <View style={styles.reasonCopy}>
              <Text style={styles.reasonText}>Why this reached you: {featuredIntent.reason}</Text>
              <Text style={styles.reasonMeta}>Origin circle stays private.</Text>
            </View>
          </View>
        </Section>

        <Section>
          <Group>
            <PrivacyStrip />
          </Group>
        </Section>

        <Section>
          <Group>
            <View style={styles.hiddenRow}>
              <IconLine fallback="H" icon="lock" text="Hidden until accepted. Exact place and contact details." />
            </View>
          </Group>
        </Section>
      </ScrollView>
      <ActionTray primaryLabel="Request to join" secondaryLabel="Not relevant" onPrimary={() => router.push('/request/badminton-tonight')} />
    </SafeAreaView>
  );
}

const createStyles = (color: ColorScheme) =>
  StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: color.background.app },
  content: { paddingHorizontal: 20, paddingBottom: 26 },
  summary: { gap: 12, padding: 16 },
  title: { fontWeight: '700', fontSize: 24, lineHeight: 30, color: color.text.primary },
  meta: { fontWeight: '400', fontSize: 15, lineHeight: 21, color: color.text.secondary },
  expiryPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: color.background.success },
  expiryText: { fontWeight: '600', fontSize: 13, color: color.on.success },
  context: { gap: 14, padding: 16 },
  body: { fontWeight: '400', fontSize: 16, lineHeight: 23, color: color.text.primary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: color.background.surfaceMuted },
  infoChipText: { fontWeight: '600', fontSize: 12, color: color.text.secondary },
  reasonPanel: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: color.background.success },
  reasonCopy: { flex: 1 },
  reasonText: { fontWeight: '600', fontSize: 14, lineHeight: 20, color: color.on.success },
  reasonMeta: { marginTop: 3, fontWeight: '400', fontSize: 13, lineHeight: 18, color: color.on.success },
  hiddenRow: { paddingHorizontal: 16, paddingBottom: 14 },
});
