import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import { activityResponses } from '@/features/native-demo/nearcast-fixtures';
import {
  ActivityRow,
  DividerHairline,
  EmptyState,
  FilterPills,
  Group,
  IntentRow,
  ScreenHeader,
  Section,
} from '@/features/native-demo/native-ui';

type Filter = 'all' | 'responses' | 'matches';

export default function ActivityScreen() {
  const [filter, setFilter] = useState<Filter>('all');

  const visibleResponses = useMemo(() => {
    if (filter === 'responses') return activityResponses.filter((row) => row.badge && row.badge > 0);
    if (filter === 'matches') return activityResponses.filter((row) => row.status === 'Matched');
    return activityResponses;
  }, [filter]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader
        title="Activity"
        actionIcon="line.3.horizontal.decrease"
        actionFallback="F"
        actionLabel="Filter activity"
        onAction={() => undefined}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <FilterPills<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'responses', label: 'Responses' },
            { value: 'matches', label: 'Matches' },
          ]}
        />

        <Section title="Needs your attention">
          {visibleResponses.length === 0 ? (
            <Group>
              <EmptyState
                icon="tray"
                fallback="·"
                title="Nothing to review"
                body="Responses and matches will show up here when they happen."
              />
            </Group>
          ) : (
            <Group>
              {visibleResponses.map((row, idx) => (
                <View key={row.id}>
                  <ActivityRow
                    initials={row.initials}
                    title={row.title}
                    body={row.body}
                    time={row.time}
                    badge={row.badge}
                    status={row.status}
                    onPress={() => router.push(`/intent/${activityResponses[0].id}`)}
                  />
                  {idx < visibleResponses.length - 1 ? <DividerHairline inset={70} /> : null}
                </View>
              ))}
            </Group>
          )}
        </Section>

        <Section title="Your intents">
          <View style={styles.intentList}>
            <IntentRow
              title="Badminton after work"
              meta="Live · 2 responses · Ends tonight"
              onPress={() => router.push('/intent/badminton-tonight')}
            />
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 30 },
  intentList: { paddingHorizontal: 2 },
});
