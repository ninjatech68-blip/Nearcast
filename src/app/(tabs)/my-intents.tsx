import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { myIntents } from '@/features/native-demo/nearcast-fixtures';
import {
  EmptyState,
  FilterPills,
  IntentRow,
  ScreenHeader,
  Section,
} from '@/features/native-demo/native-ui';

type Filter = 'live' | 'drafts' | 'ended';

function statusFor(intent: (typeof myIntents)[number]): Filter {
  if (intent.meta.startsWith('Draft')) return 'drafts';
  if (intent.meta.startsWith('Live') || intent.meta.startsWith('Open')) return 'live';
  return 'ended';
}

export default function MyIntentsScreen() {
  const [filter, setFilter] = useState<Filter>('live');

  const counts = useMemo(
    () => ({
      live: myIntents.filter((i) => statusFor(i) === 'live').length,
      drafts: myIntents.filter((i) => statusFor(i) === 'drafts').length,
      ended: myIntents.filter((i) => statusFor(i) === 'ended').length,
    }),
    [],
  );

  const visible = useMemo(() => myIntents.filter((i) => statusFor(i) === filter), [filter]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader
        title="My intents"
        actionIcon="plus.circle"
        actionFallback="+"
        actionLabel="New intent"
        onAction={() => router.push('/create')}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>What you have broadcast, and everything still in draft.</Text>

        <FilterPills<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'live', label: 'Live', count: counts.live },
            { value: 'drafts', label: 'Drafts', count: counts.drafts },
            { value: 'ended', label: 'Ended', count: counts.ended },
          ]}
        />

        <Section>
          {visible.length === 0 ? (
            <EmptyState
              icon="square.stack"
              fallback="□"
              title={filter === 'drafts' ? 'No drafts saved' : filter === 'live' ? 'Nothing live right now' : 'Nothing ended yet'}
              body={
                filter === 'drafts'
                  ? 'Anything you start writing stays here until you review and publish it.'
                  : filter === 'live'
                    ? 'Broadcast an intent to start reaching your trusted network.'
                    : 'Past intents will archive here once they end.'
              }
              actionLabel={filter === 'ended' ? undefined : 'Broadcast intent'}
              onAction={filter === 'ended' ? undefined : () => router.push('/create')}
            />
          ) : (
            <View style={styles.list}>
              {visible.map((row) => (
                <IntentRow
                  key={row.id}
                  title={row.title}
                  meta={row.meta}
                  onPress={() => router.push(`/intent/${row.id}`)}
                />
              ))}
            </View>
          )}
        </Section>

        <View style={styles.footerAction}>
          <Button
            label="Broadcast intent"
            onPress={() => router.push('/create')}
            leadingIcon={
              <Text style={styles.plusLead}>+</Text>
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 30 },
  lead: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 16,
    lineHeight: 23,
    color: tokens.semantic.color.textSecondary,
    marginBottom: 18,
    maxWidth: 320,
  },
  list: { paddingHorizontal: 2 },
  footerAction: { marginTop: 20 },
  plusLead: { color: '#FFFFFF', fontFamily: 'Manrope_700Bold', fontSize: 16 },
});
