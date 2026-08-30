import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import {
  fetchOwnerIntents,
  resolveIntent,
  withdrawIntent,
  type OwnerIntent,
} from '@/features/intents/manage/data/owner-intents-repository';
import type { OwnerAction } from '@/features/intents/manage/domain/owner-actions';
import { IntentStatusHeader } from '@/features/intents/manage/ui/intent-status-header';
import { supabase } from '@/infrastructure/supabase/client';

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; intents: OwnerIntent[] };

/**
 * My Intents. The owner's own broadcasts with their current state and the
 * actions that state permits. Lifecycle changes carry the version we read, so
 * a change made on another device is refused rather than silently overwritten.
 */
export default function BroadcastTab() {
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [busy, setBusy] = useState<{ id: string; action: OwnerAction } | null>(null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await supabase.auth.getUser();
        const viewerId = data.user?.id;

        if (viewerId === undefined) {
          if (!cancelled) setState({ status: 'ready', intents: [] });
          return;
        }

        const intents = await fetchOwnerIntents(viewerId);
        if (!cancelled) setState({ status: 'ready', intents });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const runAction = useCallback(
    async (intent: OwnerIntent, action: OwnerAction) => {
      if (action === 'edit') {
        router.push('/preview');
        return;
      }

      if (action === 'duplicate') {
        router.push('/create');
        return;
      }

      setBusy({ id: intent.id, action });
      setStaleNotice(null);

      try {
        const result =
          action === 'withdraw'
            ? await withdrawIntent(intent.id, intent.version)
            : await resolveIntent(intent.id, intent.version);

        setState((current) =>
          current.status === 'ready'
            ? {
                status: 'ready',
                intents: current.intents.map((entry) =>
                  entry.id === intent.id
                    ? { ...entry, status: result.status, version: result.version }
                    : entry,
                ),
              }
            : current,
        );
      } catch {
        // The most likely cause is a change made elsewhere, so reload rather
        // than leaving a stale version on screen for the next attempt.
        setStaleNotice(
          'This intent changed somewhere else. We reloaded it so you can try again.',
        );
        setReloadToken((token) => token + 1);
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          My intents
        </Text>

        <Button label="New intent" onPress={() => router.push('/create')} />

        {staleNotice !== null && (
          <Text accessibilityRole="alert" style={styles.notice}>
            {staleNotice}
          </Text>
        )}

        {state.status === 'loading' && (
          <ActivityIndicator color={tokens.semantic.color.actionPrimary} />
        )}

        {state.status === 'error' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try loading your intents again"
            onPress={() => setReloadToken((token) => token + 1)}>
            <Text style={styles.retry}>
              We could not load your intents. Tap to try again.
            </Text>
          </Pressable>
        )}

        {state.status === 'ready' && state.intents.length === 0 && (
          <Text style={styles.empty}>
            You have not broadcast anything yet. What do you need?
          </Text>
        )}

        {state.status === 'ready' &&
          state.intents.map((intent) => (
            <View key={intent.id} style={styles.card}>
              <Text style={styles.statement}>{intent.statement}</Text>
              <IntentStatusHeader
                busyAction={busy?.id === intent.id ? busy.action : null}
                onAction={(action) => void runAction(intent, action)}
                status={intent.status}
              />
            </View>
          ))}
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
  card: { gap: tokens.primitive.space[2] },
  statement: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.bodyLarge.fontSize,
    lineHeight: tokens.typography.bodyLarge.lineHeight,
  },
  empty: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.body.fontSize,
    lineHeight: tokens.typography.body.lineHeight,
  },
  notice: {
    color: tokens.semantic.color.warningText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
  },
  retry: {
    color: tokens.semantic.color.dangerText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
  },
});
