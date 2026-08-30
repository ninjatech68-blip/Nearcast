import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import {
  fetchHomeFeed,
  hideDelivery,
  markNotRelevant,
  setSaved,
  type FeedCard,
} from '@/features/feed/data/feed-repository';
import { FEEDBACK_LABELS, type FeedbackAction } from '@/features/feed/domain/delivery-reason';
import { describeDistanceBand } from '@/features/location/domain/distance-band';

type FeedState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; cards: FeedCard[] };

/**
 * Home.
 *
 * A finite list of intents that were delivered to this person, each carrying
 * the explanation stored when it reached them. There is no infinite scroll and
 * no activity count: the list ends where the deliveries end, and a quiet day
 * shows a short list rather than padding.
 */
export default function HomeScreen() {
  const [state, setState] = useState<FeedState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const cards = await fetchHomeFeed();
        if (!cancelled) setState({ status: 'ready', cards });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const act = useCallback(async (card: FeedCard, action: FeedbackAction) => {
    try {
      if (action === 'hide') await hideDelivery(card.deliveryId);
      else if (action === 'not_relevant') await markNotRelevant(card.deliveryId);
      else await setSaved(card.deliveryId, !card.isSaved);
    } finally {
      setReloadToken((token) => token + 1);
    }
  }, []);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          For you
        </Text>

        {state.status === 'loading' && (
          <ActivityIndicator color={tokens.semantic.color.actionPrimary} />
        )}

        {state.status === 'error' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try loading your feed again"
            onPress={() => setReloadToken((token) => token + 1)}>
            <Text style={styles.retry}>We could not load this. Tap to try again.</Text>
          </Pressable>
        )}

        {state.status === 'ready' && state.cards.length === 0 && (
          <Text style={styles.empty}>
            Nothing right now. Intents appear here when they reach you.
          </Text>
        )}

        {state.status === 'ready' &&
          state.cards.map((card) => (
            <View key={card.deliveryId} style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open intent: ${card.statement}`}
                onPress={() => router.push(`/intent/${card.intentId}`)}>
                <Text style={styles.statement}>{card.statement}</Text>
                <Text style={styles.meta}>
                  {card.broadcasterFirstName ?? 'Someone nearby'} ·{' '}
                  {describeDistanceBand(card.distanceBand)}
                  {card.approximatePlace === null ? '' : ` · ${card.approximatePlace}`}
                </Text>
              </Pressable>

              <Text accessibilityLabel="Why you see this" style={styles.reason}>
                {card.reasonText}
              </Text>

              <View style={styles.actions}>
                {(['save', 'hide', 'not_relevant'] as const).map((action) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${FEEDBACK_LABELS[action]}: ${card.statement}`}
                    key={action}
                    onPress={() => void act(card, action)}>
                    <Text style={styles.actionText}>
                      {action === 'save' && card.isSaved
                        ? 'Saved'
                        : FEEDBACK_LABELS[action]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

        {state.status === 'ready' && state.cards.length > 0 && (
          <Text style={styles.endOfList}>That is everything for now.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: {
    gap: tokens.primitive.space[4],
    paddingHorizontal: tokens.primitive.space[5],
    paddingTop: tokens.primitive.space[3],
    paddingBottom: tokens.primitive.space[8],
  },
  title: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_700Bold',
    fontSize: tokens.typography.title1.fontSize,
    lineHeight: tokens.typography.title1.lineHeight,
  },
  card: {
    backgroundColor: tokens.semantic.color.backgroundSurface,
    borderColor: tokens.semantic.color.borderDefault,
    borderRadius: tokens.primitive.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: tokens.primitive.space[2],
    padding: tokens.primitive.space[4],
  },
  statement: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.bodyLarge.fontSize,
    lineHeight: tokens.typography.bodyLarge.lineHeight,
  },
  meta: {
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.caption.fontSize,
    marginTop: tokens.primitive.space[1],
  },
  reason: {
    color: tokens.semantic.color.trustText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
  },
  actions: {
    borderTopColor: tokens.semantic.color.borderDefault,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: tokens.primitive.space[5],
    paddingTop: tokens.primitive.space[3],
  },
  actionText: {
    color: tokens.semantic.color.actionPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
  },
  empty: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.body.fontSize,
    lineHeight: tokens.typography.body.lineHeight,
  },
  endOfList: {
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.caption.fontSize,
    textAlign: 'center',
  },
  retry: {
    color: tokens.semantic.color.dangerText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
  },
});
