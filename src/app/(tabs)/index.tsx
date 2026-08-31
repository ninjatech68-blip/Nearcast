import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import { featuredIntent, secondIntent } from '@/features/native-demo/nearcast-fixtures';
import { Group, IconLine, IntentCard, ScreenTitle, Section, TeachingNote } from '@/features/native-demo/native-ui';

export default function HomeScreen() {
  // Shown until dismissed. Gating this to genuine first exposure needs account
  // state, which is not built yet; see `you.tsx` for the same pending dependency.
  const [teachingVisible, setTeachingVisible] = useState(true);

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

        {teachingVisible ? (
          <View style={styles.teachingSlot}>
            <TeachingNote
              body="A cast is a plan someone nearby opened up. Asking to join sends them a private request — nothing is shared with anyone else until they accept."
              onDismiss={() => setTeachingVisible(false)}
              title="What you are seeing"
            />
          </View>
        ) : null}

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
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterIcon: { fontFamily: 'Manrope_700Bold', fontSize: 20, color: tokens.semantic.color.textSecondary },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  filterPill: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 13, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, borderRadius: 12, backgroundColor: tokens.semantic.color.backgroundSurface },
  filterText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: tokens.semantic.color.textSecondary },
  cardStack: { gap: 12 },
  teachingSlot: { marginTop: 18 },
  privacyRow: { paddingHorizontal: 16, paddingBottom: 14 },
});
