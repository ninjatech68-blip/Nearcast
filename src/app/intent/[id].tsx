import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { StatePanel, type ScreenState } from '@/design-system/components/state-panel';
import { tokens } from '@/design-system/tokens';
import { useSession } from '@/features/auth/session';
import { fetchIntentDetail, type IntentDetail } from '@/features/intents/data/intent-queries';

type DetailState = { kind: 'content'; intent: IntentDetail } | ScreenState;

/**
 * Progressive disclosure order: what it is, why you received it, provenance,
 * then the single contextual action. Identity never leads.
 */
export default function IntentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useSession();

  const detail = useQuery({
    queryKey: ['intent', id, userId],
    queryFn: () => fetchIntentDetail(id ?? '', userId),
  });

  const state: DetailState = detail.isPending
    ? { kind: 'loading' }
    : detail.isError || !detail.data || detail.data.state === 'error'
      ? { kind: 'error', message: 'We could not load this intent. Try again.' }
      : detail.data.data
        ? { kind: 'content', intent: detail.data.data }
        : { kind: 'restricted', message: 'This information is not available to you.' };

  if (state.kind !== 'content') {
    return (
      <SafeAreaView style={styles.screen}>
        <BackBar />
        <StatePanel onRetry={() => void detail.refetch()} state={state} />
      </SafeAreaView>
    );
  }

  const { intent } = state;

  return (
    <SafeAreaView style={styles.screen}>
      <BackBar />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.primitive}>{intent.primitiveLabel}</Text>
        <Text accessibilityRole="header" style={styles.statement}>
          {intent.statement}
        </Text>
        {intent.approximatePlace ? (
          <Text style={styles.meta}>{intent.approximatePlace} area</Text>
        ) : null}

        {intent.reasonText ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonTitle}>Why you are seeing this</Text>
            <Text style={styles.reasonBody}>{intent.reasonText}</Text>
          </View>
        ) : null}

        <View style={styles.trustBox}>
          <Text style={styles.trustText}>
            {intent.confirmationCount === 0
              ? 'No confirmations yet.'
              : intent.confirmationCount === 1
                ? 'Confirmed by 1 person at the origin.'
                : `Confirmed by ${intent.confirmationCount} people at the origin.`}
          </Text>
          <Text style={styles.trustHint}>
            Confirmation means someone recognises or supports this intent. It does not guarantee
            attendance, accuracy, or safety.
          </Text>
        </View>

        {intent.broadcasterFirstName ? (
          <Text style={styles.meta}>Shared by {intent.broadcasterFirstName}</Text>
        ) : null}

        <Text style={styles.privacy}>
          No exact address or contact details are shown. The originating group stays private.
        </Text>
      </ScrollView>

      {!intent.isOwn ? (
        <View style={styles.footer}>
          <Button
            label={intent.responseAction}
            onPress={() => router.push(`/request/${intent.id}`)}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function BackBar() {
  return (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      hitSlop={12}
      onPress={() => router.back()}
      style={styles.backBar}>
      <Text style={styles.backLabel}>Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  backBar: { paddingHorizontal: 16, paddingVertical: 12 },
  backLabel: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  primitive: { color: tokens.semantic.color.trustText, fontFamily: 'Manrope_600SemiBold', fontSize: 12, textTransform: 'uppercase' },
  statement: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 22, lineHeight: 28 },
  meta: { color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_400Regular', fontSize: 15 },
  reasonBox: { marginTop: 8, padding: 16, borderRadius: tokens.primitive.radius.card, backgroundColor: tokens.semantic.color.infoSurface, gap: 4 },
  reasonTitle: { color: tokens.semantic.color.infoText, fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  reasonBody: { color: tokens.semantic.color.infoText, fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20 },
  trustBox: { padding: 16, borderRadius: tokens.primitive.radius.card, backgroundColor: tokens.semantic.color.trustSurface, gap: 4 },
  trustText: { color: tokens.semantic.color.trustText, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  trustHint: { color: tokens.semantic.color.trustText, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19 },
  privacy: { marginTop: 8, color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: tokens.semantic.color.borderDefault },
});
