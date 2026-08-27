import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import { featuredIntent, secondIntent, thirdIntent } from '@/features/native-demo/nearcast-fixtures';
import {
  CardSkeleton,
  EmptyState,
  IntentCard,
  ScreenHeader,
  StatusBanner,
} from '@/features/native-demo/native-ui';

type FeedState = 'ready' | 'loading' | 'empty' | 'error' | 'offline';

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [state] = useState<FeedState>('ready');

  const intents = useMemo(() => [featuredIntent, secondIntent, thirdIntent], []);

  function onRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader
        title="For you"
        actionIcon="person.crop.circle"
        actionFallback="Y"
        actionLabel="Open your profile"
        onAction={() => router.push('/(tabs)/you')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.semantic.color.actionPrimary} />}
      >
        <Text style={styles.lead}>Relevant intents from nearby trusted networks.</Text>

        {state === 'offline' ? (
          <StatusBanner
            tone="warning"
            title="You are offline"
            body="You will see the latest intents once you reconnect."
            icon="wifi.slash"
            fallback="!"
          />
        ) : null}

        {state === 'loading' ? (
          <View style={styles.cardStack}>
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : null}

        {state === 'error' ? (
          <EmptyState
            icon="exclamationmark.triangle"
            fallback="!"
            title="Something went wrong"
            body="We couldn’t load your feed. Pull down to try again."
          />
        ) : null}

        {state === 'empty' ? (
          <EmptyState
            icon="tray"
            fallback="·"
            title="Nothing to show yet"
            body="Trusted intents nearby will appear here. Broadcast one to get things going."
            actionLabel="Broadcast intent"
            onAction={() => router.push('/create')}
          />
        ) : null}

        {state === 'ready' ? (
          <View style={styles.cardStack}>
            {intents.map((intent) => (
              <IntentCard
                key={intent.id}
                intent={intent}
                onOpen={() => router.push(`/intent/${intent.id}`)}
                onPrimaryPress={() => router.push(`/request/${intent.id}`)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 30 },
  lead: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 16,
    lineHeight: 23,
    color: tokens.semantic.color.textSecondary,
    marginTop: 1,
    marginBottom: 18,
    maxWidth: 320,
  },
  cardStack: { gap: 14 },
});
