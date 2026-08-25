import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatePanel, type ScreenState } from '@/design-system/components/state-panel';
import { tokens } from '@/design-system/tokens';
import { useSession } from '@/features/auth/session';
import { formatExpiry } from '@/features/intents/domain/expiry';
import { fetchFeed, type FeedCard } from '@/features/intents/data/intent-queries';

type FeedState =
  | { kind: 'content'; cards: FeedCard[] }
  | ScreenState;

export default function HomeScreen() {
  const { status, hasProfile } = useSession();
  const enabled = status === 'signed-in' && hasProfile;
  const [refreshing, setRefreshing] = useState(false);

  const feed = useQuery({
    queryKey: ['feed'],
    queryFn: () => fetchFeed(),
    enabled,
  });

  if (status === 'loading') {
    return (
      <Shell>
        <StatePanel state={{ kind: 'loading' }} />
      </Shell>
    );
  }

  if (!enabled) {
    return (
      <Shell>
        <StatePanel
          state={{
            kind: 'restricted',
            message: 'Sign in with your invitation to see intents shared with you.',
          }}
        />
      </Shell>
    );
  }

  const state = toFeedState(feed.isPending, feed.isError, feed.data);

  if (state.kind !== 'content') {
    return (
      <Shell>
        <StatePanel onRetry={() => void feed.refetch()} state={state} />
      </Shell>
    );
  }

  async function refresh() {
    setRefreshing(true);
    await feed.refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl onRefresh={() => void refresh()} refreshing={refreshing} />
        }>
        <Text accessibilityRole="header" style={styles.screenTitle}>
          For You
        </Text>
        <Text style={styles.subtitle}>
          {state.cards.length === 1 ? '1 active intent' : `${state.cards.length} active intents`}
        </Text>

        <View style={styles.cardStack}>
          {state.cards.map((card) => (
            <IntentFeedCard card={card} key={card.id} />
          ))}
        </View>

        <Text style={styles.privacyNote}>
          Origins, exact places, and contact details stay hidden until permission changes.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Maps a query result onto the state contract every data screen must satisfy. */
export function toFeedState(
  isPending: boolean,
  isError: boolean,
  result: Awaited<ReturnType<typeof fetchFeed>> | undefined,
): FeedState {
  if (isPending) return { kind: 'loading' };
  if (isError || !result) {
    return { kind: 'error', message: 'We could not load your feed. Try again.' };
  }
  if (result.state === 'error') return { kind: 'error', message: result.message };
  if (result.data.length === 0) {
    return {
      kind: 'empty',
      title: 'Nothing relevant is active right now',
      body: 'Adjust your preferences or broadcast an intent.',
    };
  }
  return { kind: 'content', cards: result.data };
}

/**
 * Intent-first ordering: the statement leads, identity follows. The delivery
 * reason is always present because the database refuses to store a delivery
 * without one.
 */
function IntentFeedCard({ card }: { card: FeedCard }) {
  return (
    <Pressable
      accessibilityLabel={`Open intent: ${card.statement}`}
      accessibilityRole="button"
      onPress={() => router.push(`/intent/${card.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardTopRow}>
        <Text style={styles.primitive}>{card.primitiveLabel}</Text>
        <Text style={styles.expiry}>{formatExpiry(card.expiresAt)}</Text>
      </View>
      <Text style={styles.statement}>{card.statement}</Text>
      {card.approximatePlace ? (
        <Text style={styles.meta}>{card.approximatePlace} area</Text>
      ) : null}
      <Text style={styles.reason}>Why you are seeing this: {card.reasonText}</Text>
      {card.confirmationCount > 0 ? (
        <Text style={styles.confirmations}>
          {card.confirmationCount === 1
            ? 'Confirmed by 1 person at the origin'
            : `Confirmed by ${card.confirmationCount} people at the origin`}
        </Text>
      ) : null}
      <Text style={styles.action}>{card.responseAction}</Text>
    </Pressable>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Text accessibilityRole="header" style={[styles.screenTitle, styles.shellTitle]}>
        For You
      </Text>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 },
  screenTitle: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_700Bold',
    fontSize: 26,
    lineHeight: 32,
  },
  shellTitle: { paddingHorizontal: 16, paddingTop: 12 },
  subtitle: {
    marginTop: 4,
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
  },
  cardStack: { marginTop: 16, gap: 12 },
  card: {
    borderRadius: tokens.component.intentCard.radius,
    borderWidth: 1,
    borderColor: tokens.component.intentCard.border,
    backgroundColor: tokens.component.intentCard.background,
    padding: tokens.component.intentCard.padding,
    gap: 6,
  },
  cardPressed: { backgroundColor: tokens.semantic.color.backgroundSubtle },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  primitive: {
    color: tokens.semantic.color.trustText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  expiry: {
    color: tokens.semantic.color.warningText,
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  statement: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    lineHeight: 24,
  },
  meta: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
  },
  reason: {
    color: tokens.semantic.color.infoText,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  confirmations: {
    color: tokens.semantic.color.trustText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  action: {
    marginTop: 4,
    color: tokens.semantic.color.actionPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  privacyNote: {
    marginTop: 20,
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
});
