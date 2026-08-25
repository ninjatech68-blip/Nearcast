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
          <Text style={styles.actionPrimary}>
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

        {intent.isOwn && (intent.status === 'live' || intent.status === 'matched') ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push(`/resolve/${intent.id}?status=${intent.status}`)
            }
            style={({ pressed }) => [styles.resolveLink, pressed && styles.resolveLinkPressed]}>
            <Text style={styles.resolveLabel}>Resolve or withdraw intent</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {intent.matchId ? (
          <Button
            label="Open coordination"
            onPress={() => router.push(`/room/${intent.matchId}`)}
          />
        ) : intent.isOwn ? (
          <Button
            label={
              intent.responseCount === 0
                ? 'No responses yet'
                : intent.responseCount === 1
                  ? 'Review 1 response'
                  : `Review ${intent.responseCount} responses`
            }
            disabled={intent.responseCount === 0}
            onPress={() => router.push(`/inbox/${intent.id}`)}
          />
        ) : (
          <Button
            label={intent.responseAction}
            onPress={() => router.push(`/request/${intent.id}`)}
          />
        )}
      </View>
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
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundApp },
  backBar: { paddingHorizontal: 16, paddingVertical: 12 },
  backLabel: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 16 },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  primitive: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 11, textTransform: 'uppercase' },
  statement: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 20, lineHeight: 26 },
  meta: { color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_400Regular', fontSize: 16 },
  reasonBox: { marginTop: 8, padding: 16, borderRadius: tokens.primitive.radius.card, backgroundColor: tokens.semantic.color.backgroundInfo, gap: 4 },
  reasonTitle: { color: tokens.semantic.color.actionSecondary, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  reasonBody: { color: tokens.semantic.color.actionSecondary, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18 },
  trustBox: { padding: 16, borderRadius: tokens.primitive.radius.card, backgroundColor: tokens.semantic.color.backgroundSuccess, gap: 4 },
  actionPrimary: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 16 },
  trustHint: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18 },
  privacy: { marginTop: 8, color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18 },
  resolveLink: { marginTop: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.primitive.radius.button, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle },
  resolveLinkPressed: { backgroundColor: tokens.semantic.color.backgroundSurfaceMuted },
  resolveLabel: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 16 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: tokens.semantic.color.borderSubtle },
});
