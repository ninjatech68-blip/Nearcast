import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatePanel, type ScreenState } from '@/design-system/components/state-panel';
import { tokens } from '@/design-system/tokens';
import { useSession } from '@/features/auth/session';
import { decideResponse, fetchInbox, type InboxEntry } from '@/features/coordination/queries';

type InboxState = { kind: 'content'; entries: InboxEntry[] } | ScreenState;

/**
 * The broadcaster's request inbox. One respondent per card, contextual trust
 * evidence only, and a neutral declined state — a respondent never learns
 * private reasoning, and never sees a competitor.
 */
export default function InboxScreen() {
  const { intentId } = useLocalSearchParams<{ intentId: string }>();
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const inbox = useQuery({
    queryKey: ['inbox', intentId],
    queryFn: () => fetchInbox(intentId ?? ''),
    enabled: userId !== null,
  });

  const decide = useMutation({
    mutationFn: ({ responseId, decision }: { responseId: string; decision: 'accept' | 'decline' }) =>
      decideResponse(responseId, decision),
    onSuccess: async (result, variables) => {
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['inbox', intentId] });
      await queryClient.invalidateQueries({ queryKey: ['intent', intentId] });
      await queryClient.invalidateQueries({ queryKey: ['activity'] });
      if (variables.decision === 'accept') {
        // Acceptance opens exactly one room; take the broadcaster straight there.
        router.replace(`/intent/${intentId}`);
      }
    },
  });

  const state: InboxState = inbox.isPending
    ? { kind: 'loading' }
    : inbox.isError || !inbox.data || inbox.data.state === 'error'
      ? { kind: 'error', message: 'We could not load the responses. Try again.' }
      : inbox.data.data.length === 0
        ? {
            kind: 'empty',
            title: 'No relevant responses yet',
            body: 'You can wait, edit the intent, or expand its reach.',
          }
        : { kind: 'content', entries: inbox.data.data };

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={12}
        onPress={() => router.back()}
        style={styles.backBar}>
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>
        Responses
      </Text>

      {state.kind !== 'content' ? (
        <StatePanel onRetry={() => void inbox.refetch()} state={state} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          {state.entries.map((entry) => (
            <RequestCard
              busy={decide.isPending}
              entry={entry}
              key={entry.responseId}
              onDecide={(decision) => decide.mutate({ responseId: entry.responseId, decision })}
            />
          ))}
          <Text style={styles.privacy}>
            Declined respondents receive a neutral status. Accepting shares your display name and
            opens a private coordination room; nothing else is revealed until you choose to share
            it.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RequestCard({
  busy,
  entry,
  onDecide,
}: {
  busy: boolean;
  entry: InboxEntry;
  onDecide: (decision: 'accept' | 'decline') => void;
}) {
  const qualificationLines = Object.entries(entry.qualification);

  return (
    <View style={styles.card} testID={`request-${entry.responseId}`}>
      <Text style={styles.name}>{entry.respondentName}</Text>
      {entry.reliabilityLine ? (
        <Text style={styles.trust}>{entry.reliabilityLine}</Text>
      ) : (
        <Text style={styles.trustMuted}>No confirmed interactions yet</Text>
      )}
      <Text style={styles.message}>{entry.message}</Text>
      {qualificationLines.map(([key, value]) => (
        <Text key={key} style={styles.qualification}>
          {key}: {value}
        </Text>
      ))}

      {entry.status === 'pending' ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => onDecide('accept')}
            style={({ pressed }) => [styles.accept, pressed && styles.acceptPressed]}>
            <Text style={styles.acceptLabel}>Accept response</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => onDecide('decline')}
            style={({ pressed }) => [styles.decline, pressed && styles.declinePressed]}>
            <Text style={styles.declineLabel}>Decline</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.status}>
          {entry.status === 'accepted' ? 'Accepted' : entry.status === 'declined' ? 'Declined' : 'Withdrawn'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundApp },
  backBar: { paddingHorizontal: 16, paddingVertical: 12 },
  backLabel: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 16 },
  title: { paddingHorizontal: 20, color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 28, lineHeight: 34 },
  content: { padding: 20, gap: 12 },
  error: { color: tokens.semantic.color.statusDanger, fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18 },
  card: { padding: 16, borderRadius: tokens.primitive.radius.card, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle, backgroundColor: tokens.semantic.color.backgroundSurface, gap: 6 },
  name: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 16 },
  trust: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  trustMuted: { color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_400Regular', fontSize: 13 },
  message: { color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_400Regular', fontSize: 16, lineHeight: 24 },
  qualification: { color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_400Regular', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  accept: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.primitive.radius.button, backgroundColor: tokens.semantic.color.actionPrimary },
  acceptPressed: { backgroundColor: tokens.semantic.color.actionPrimaryPressed },
  acceptLabel: { color: tokens.semantic.color.onPrimary, fontFamily: 'Manrope_700Bold', fontSize: 16 },
  decline: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.primitive.radius.button, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle, backgroundColor: tokens.semantic.color.backgroundSurface },
  declinePressed: { backgroundColor: tokens.semantic.color.backgroundSurfaceMuted },
  declineLabel: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 16 },
  status: { marginTop: 6, color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  privacy: { marginTop: 8, color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18 },
});
