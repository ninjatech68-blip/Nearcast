import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import { broadcaster, featuredIntent, secondIntent, thirdIntent } from '@/features/native-demo/nearcast-fixtures';
import type { IntentSummary } from '@/features/native-demo/native-ui';
import {
  ActionTray,
  DividerHairline,
  EmptyState,
  Group,
  PrimitiveChip,
  PrivacyStrip,
  ProfileBlock,
  Section,
  StatusBanner,
  SymbolIcon,
  TimeChip,
  TopBar,
} from '@/features/native-demo/native-ui';

const ALL: readonly IntentSummary[] = [featuredIntent, secondIntent, thirdIntent];

export default function IntentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const intent = ALL.find((i) => i.id === id) ?? featuredIntent;
  const notFound = !ALL.some((i) => i.id === id) && id !== undefined;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <TopBar
        title="Intent"
        onBack={() => router.back()}
        rightAction={
          <View style={styles.headerActions}>
            <SymbolIcon color={tokens.semantic.color.textPrimary} fallback="🔖" name="bookmark" size={20} />
            <SymbolIcon color={tokens.semantic.color.textPrimary} fallback="↑" name="square.and.arrow.up" size={20} />
          </View>
        }
      />
      {notFound ? (
        <View style={styles.notFound}>
          <EmptyState
            icon="questionmark.circle"
            fallback="?"
            title="Intent not found"
            body="This intent may have ended or is no longer visible to you."
            actionLabel="Back to For you"
            onAction={() => router.replace('/(tabs)')}
          />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.summary}>
              <View style={styles.summaryHead}>
                <PrimitiveChip label={intent.primitive} />
                <TimeChip label={intent.expiry} />
              </View>
              <Text style={styles.title}>{intent.title}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <SymbolIcon color={tokens.semantic.color.textSecondary} fallback="📍" name="mappin.and.ellipse" size={15} />
                  <Text style={styles.metaText}>{intent.area}</Text>
                </View>
                <View style={styles.metaItem}>
                  <SymbolIcon color={tokens.semantic.color.textSecondary} fallback="✓" name="checkmark.seal" size={15} />
                  <Text style={styles.metaText}>{intent.confirmations}</Text>
                </View>
              </View>
            </View>

            <Section title="Posted by">
              <Group>
                <ProfileBlock {...broadcaster} onOpen={() => router.push(`/profile/${broadcaster.id}`)} />
              </Group>
            </Section>

            {intent.summary ? (
              <Section title="What they need">
                <Group padded>
                  <Text style={styles.body}>{intent.summary}</Text>
                  {intent.chips && intent.chips.length > 0 ? (
                    <View style={styles.chipRow}>
                      {intent.chips.map((chip) => (
                        <View key={chip} style={styles.infoChip}>
                          <Text style={styles.infoChipText}>{chip}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Group>
              </Section>
            ) : null}

            <Section>
              <StatusBanner
                tone="info"
                title="Why you’re seeing this"
                body={intent.reason}
                icon="questionmark.circle"
                fallback="?"
              />
            </Section>

            <Section title="Privacy">
              <Group>
                <PrivacyStrip />
                <DividerHairline />
                <View style={styles.hiddenNote}>
                  <SymbolIcon color={tokens.semantic.color.actionPrimary} fallback="🔒" name="lock" size={16} />
                  <Text style={styles.hiddenText}>Hidden until accepted. Exact place and contact details.</Text>
                </View>
              </Group>
            </Section>
          </ScrollView>
          <ActionTray
            primaryLabel={intent.action}
            secondaryLabel="Not relevant"
            leadingIcon={<SymbolIcon color="#FFFFFF" fallback="+" name="plus.circle" size={16} />}
            onPrimary={() => router.push(`/request/${intent.id}`)}
            onSecondary={() => router.back()}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 18, paddingBottom: 26 },
  headerActions: { flexDirection: 'row', gap: 16, alignItems: 'center', paddingRight: 8 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  summary: { gap: 12, paddingVertical: 12 },
  summaryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 24, lineHeight: 30, color: tokens.semantic.color.textPrimary, letterSpacing: -0.5 },

  metaRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: 'Manrope_400Regular', fontSize: 13, color: tokens.semantic.color.textSecondary },

  body: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 23, color: tokens.semantic.color.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  infoChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: tokens.semantic.color.backgroundSubtle },
  infoChipText: { fontFamily: 'Manrope_700Bold', fontSize: 12, color: tokens.semantic.color.textSecondary },

  hiddenNote: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14 },
  hiddenText: { flex: 1, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18, color: tokens.semantic.color.textSecondary },
});
