import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import { featuredIntent, secondIntent } from '@/features/native-demo/nearcast-fixtures';
import { Group, IconLine, IntentCard, ScreenTitle, Section } from '@/features/native-demo/native-ui';

export default function HomeScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <ScreenTitle>For You</ScreenTitle>
          <Text style={styles.filterIcon}>...</Text>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterPill}><Text style={styles.filterText}>Nearby</Text></View>
          <View style={styles.filterPill}><Text style={styles.filterText}>All intents</Text></View>
        </View>

        <Section title="Around you">
          <View style={styles.cardStack}>
            <IntentCard intent={featuredIntent} onOpen={() => router.push('/intent/badminton-tonight')} />
            <IntentCard intent={secondIntent} onOpen={() => router.push('/intent/walk-and-talk')} />
          </View>
        </Section>

        <Section>
          <Group compact>
            <View style={styles.privacyRow}>
              <IconLine fallback="P" icon="lock" text="Private by design. Origins, exact places, and contact details stay hidden until permission changes." />
            </View>
          </Group>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.color.light.background.app },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterIcon: { fontFamily: 'Manrope_700Bold', fontSize: 20, color: tokens.color.light.text.secondary },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  filterPill: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 13, borderWidth: 1, borderColor: tokens.color.light.border.subtle, borderRadius: 12, backgroundColor: tokens.color.light.background.surface },
  filterText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: tokens.color.light.text.secondary },
  cardStack: { gap: 12 },
  privacyRow: { paddingHorizontal: 16, paddingBottom: 14 },
});
