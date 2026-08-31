import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { fetchDeliveredIntent } from '@/features/intents/detail/data/detail-repository';
import {
  listContextFacts,
  resolveResponseAvailability,
  type DeliveredIntent,
} from '@/features/intents/detail/domain/detail';
import { describeConfirmations } from '@/features/sharing/domain/public-intent';
import { Group, PrimitiveChip, PrivacyStrip, Section, TopBar } from '@/features/native-demo/native-ui';

type DetailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'unavailable' }
  | { status: 'ready'; intent: DeliveredIntent };

/**
 * The intent detail screen.
 *
 * Everything shown here came from `delivered_intent` for the id in the route, so
 * two different cards open two different screens. That sounds obvious and is
 * worth stating: an earlier version of this screen rendered a fixture and
 * ignored the id, which meant every card in the feed opened the same invented
 * intent and the response action pointed at a slug that did not exist.
 *
 * A row the server declines to return is "not available" rather than an error.
 * The two are different: an undelivered id, a restricted broadcaster and a block
 * all legitimately return nothing, and none of them is a fault the person can
 * retry their way out of.
 */
export default function IntentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<DetailState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const intent = await fetchDeliveredIntent(id);

        if (cancelled) return;

        setState(
          intent === null
            ? { status: 'unavailable' }
            : { status: 'ready', intent },
        );
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  const respond = useCallback((intent: DeliveredIntent) => {
    // The real intent id, so the response reaches the intent that was opened.
    router.push({
      pathname: '/request/[id]',
      params: {
        id: intent.intentId,
        ...(intent.broadcasterFirstName === null
          ? {}
          : { firstName: intent.broadcasterFirstName }),
      },
    });
  }, []);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <TopBar title="Intent" onBack={() => router.back()} />

      {state.status === 'loading' && (
        <View style={styles.centred}>
          <ActivityIndicator color={tokens.semantic.color.actionPrimary} />
        </View>
      )}

      {state.status === 'error' && (
        <View style={styles.centred}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try loading this intent again"
            onPress={() => setReloadToken((token) => token + 1)}>
            <Text style={styles.retry}>We could not load this. Tap to try again.</Text>
          </Pressable>
        </View>
      )}

      {state.status === 'unavailable' && (
        <View style={styles.centred}>
          <Text style={styles.unavailable}>
            This is not available to you any more.
          </Text>
        </View>
      )}

      {state.status === 'ready' && (
        <ReadyDetail intent={state.intent} onRespond={respond} />
      )}
    </SafeAreaView>
  );
}

function ReadyDetail({
  intent,
  onRespond,
}: {
  intent: DeliveredIntent;
  onRespond: (intent: DeliveredIntent) => void;
}) {
  const availability = resolveResponseAvailability(intent, new Date());
  const facts = listContextFacts(intent);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <Group>
          <View style={styles.summary}>
            <PrimitiveChip label={intent.primitive} />
            <Text accessibilityRole="header" style={styles.title}>
              {intent.statement}
            </Text>
            <Text style={styles.meta}>
              {intent.broadcasterFirstName ?? 'Someone nearby'}
            </Text>
          </View>
        </Group>

        <Section title="Details">
          <Group>
            <View style={styles.facts}>
              {facts.map((fact) => (
                <View key={`${fact.label}:${fact.detail}`} style={styles.factRow}>
                  <Text style={styles.factLabel}>{fact.label}</Text>
                  <Text style={styles.factDetail}>{fact.detail}</Text>
                </View>
              ))}
            </View>
          </Group>
        </Section>

        <Section>
          <View style={styles.reasonPanel}>
            <Text accessibilityLabel="Why you see this" style={styles.reasonText}>
              {intent.reasonText}
            </Text>
            <Text style={styles.reasonMeta}>Where this came from stays private.</Text>
          </View>
        </Section>

        <Section title="Confirmations">
          <Group>
            <Text accessibilityLabel="Confirmation status" style={styles.confirmations}>
              {describeConfirmations(intent.confirmationCount, intent.viewerHasConfirmed)}
            </Text>
          </Group>
        </Section>

        <Section>
          <Group>
            <PrivacyStrip />
          </Group>
        </Section>
      </ScrollView>

      <View style={styles.tray}>
        {availability.kind === 'open' ? (
          <Button label={availability.label} onPress={() => onRespond(intent)} />
        ) : (
          <Text accessibilityRole="alert" style={styles.trayNotice}>
            {availability.label}
          </Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.primitive.space[5] },
  content: { paddingHorizontal: 20, paddingBottom: 26 },
  summary: { gap: 12, padding: 16 },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 24, lineHeight: 30, color: tokens.semantic.color.textPrimary },
  meta: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textSecondary },
  facts: { gap: 12, padding: 16 },
  factRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  factLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: tokens.semantic.color.textMuted },
  factDetail: { flexShrink: 1, textAlign: 'right', fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  reasonPanel: { gap: 3, padding: 14, borderRadius: 16, backgroundColor: tokens.semantic.color.trustSurface },
  reasonText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.trustText },
  reasonMeta: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18, color: tokens.semantic.color.trustText },
  confirmations: { padding: 16, fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textSecondary },
  tray: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.semantic.color.borderDefault, backgroundColor: tokens.semantic.color.backgroundSurface },
  trayNotice: { textAlign: 'center', fontFamily: 'Manrope_600SemiBold', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.textSecondary },
  retry: { textAlign: 'center', fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: tokens.semantic.color.actionPrimary },
  unavailable: { textAlign: 'center', fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textSecondary },
});
