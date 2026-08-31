import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import {
  FEED_FILTERS,
  FEED_FILTER_LABELS,
  type FeedFilter,
  filterCasts,
} from '@/features/intents/domain/feed-filter';
import { featuredIntent, secondIntent } from '@/features/native-demo/nearcast-fixtures';
import { Group, IconLine, IntentCard, ScreenTitle, Section, TeachingNote } from '@/features/native-demo/native-ui';

const casts = [featuredIntent, secondIntent];

export default function HomeScreen() {
  // Shown until dismissed. Gating this to genuine first exposure needs account
  // state, which is not built yet; see `you.tsx` for the same pending dependency.
  const [teachingVisible, setTeachingVisible] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>('all');

  const visible = useMemo(() => filterCasts(casts, filter), [filter]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle>For You</ScreenTitle>

        <View
          accessibilityLabel="Filter casts by scope"
          accessibilityRole="radiogroup"
          style={styles.filterRow}>
          {FEED_FILTERS.map((option) => {
            const selected = filter === option;

            return (
              <Pressable
                key={option}
                accessibilityLabel={FEED_FILTER_LABELS[option]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setFilter(option)}
                style={[styles.filterPill, selected && styles.filterPillSelected]}>
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                  {FEED_FILTER_LABELS[option]}
                </Text>
              </Pressable>
            );
          })}
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
          {visible.length === 0 ? (
            <Group>
              <View style={styles.emptyRow}>
                <Text style={styles.emptyTitle}>Nothing nearby right now</Text>
                <Text style={styles.emptyBody}>
                  Widen the scope to see casts from further out, or check back later.
                </Text>
              </View>
            </Group>
          ) : (
            <View style={styles.cardStack}>
              {visible.map((cast) => (
                <IntentCard key={cast.id} intent={cast} onOpen={() => router.push(`/intent/${cast.id}`)} />
              ))}
            </View>
          )}
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
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  filterPill: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, borderRadius: 12, backgroundColor: tokens.semantic.color.backgroundSurface },
  filterPillSelected: { borderColor: tokens.semantic.color.actionPrimary, backgroundColor: tokens.semantic.color.trustSurface },
  filterText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: tokens.semantic.color.textSecondary },
  filterTextSelected: { color: tokens.semantic.color.trustText },
  cardStack: { gap: 12 },
  teachingSlot: { marginTop: 18 },
  emptyRow: { padding: 16, gap: 4 },
  emptyTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  emptyBody: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.textSecondary },
  privacyRow: { paddingHorizontal: 16, paddingBottom: 14 },
});
