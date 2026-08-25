import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatePanel, type ScreenState } from '@/design-system/components/state-panel';
import { tokens } from '@/design-system/tokens';
import { useSession } from '@/features/auth/session';
import { fetchActivity, type ActivitySnapshot } from '@/features/intents/data/activity-queries';

type ActivityState = { kind: 'content'; snapshot: ActivitySnapshot } | ScreenState;

export default function ActivityScreen() {
  const { status, hasProfile, userId } = useSession();
  const enabled = status === 'signed-in' && hasProfile && userId !== null;

  const activity = useQuery({
    queryKey: ['activity', userId],
    queryFn: () => fetchActivity(userId ?? ''),
    enabled,
  });

  if (!enabled) {
    return (
      <Frame>
        <StatePanel
          state={{ kind: 'restricted', message: 'Sign in to see your broadcasts and responses.' }}
        />
      </Frame>
    );
  }

  const state: ActivityState = activity.isPending
    ? { kind: 'loading' }
    : activity.isError || !activity.data || activity.data.state === 'error'
      ? {
          kind: 'error',
          message:
            activity.data?.state === 'error'
              ? activity.data.message
              : 'We could not load your activity. Try again.',
        }
      : { kind: 'content', snapshot: activity.data.data };

  if (state.kind !== 'content') {
    return (
      <Frame>
        <StatePanel onRetry={() => void activity.refetch()} state={state} />
      </Frame>
    );
  }

  const { owned, respondedCount, matchCount } = state.snapshot;

  return (
    <Frame>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryRow}>
          <Summary label="Your intents" value={owned.length} />
          <Summary label="Your responses" value={respondedCount} />
          <Summary label="Matches" value={matchCount} />
        </View>

        <Text style={styles.sectionTitle}>Your broadcasts</Text>
        {owned.length === 0 ? (
          <StatePanel
            state={{
              kind: 'empty',
              title: 'You have not broadcast anything yet',
              body: 'Create an intent when your circle cannot resolve it alone.',
            }}
          />
        ) : (
          owned.map((intent) => (
            <Pressable
              accessibilityLabel={`Open your intent: ${intent.statement}`}
              accessibilityRole="button"
              key={intent.id}
              onPress={() =>
                router.push(
                  intent.matchId
                    ? `/room/${intent.matchId}`
                    : intent.status === 'live' && intent.responseCount > 0
                      ? `/inbox/${intent.id}`
                      : `/intent/${intent.id}`,
                )
              }
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <View style={styles.rowTop}>
                <Text style={styles.primitive}>{intent.primitiveLabel}</Text>
                <Text style={styles.status}>{intent.statusLabel}</Text>
              </View>
              <Text style={styles.statement}>{intent.statement}</Text>
              <Text style={styles.supporting}>{intent.statusSupporting}</Text>
              <Text style={styles.responses}>
                {intent.responseCount === 0
                  ? 'No responses yet'
                  : intent.responseCount === 1
                    ? '1 response to review'
                    : `${intent.responseCount} responses to review`}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Frame>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Text accessibilityRole="header" style={styles.screenTitle}>
        Activity
      </Text>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundApp },
  screenTitle: { paddingHorizontal: 16, paddingTop: 12, color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 28, lineHeight: 34 },
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 12 },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  summary: { flex: 1, padding: 14, borderRadius: tokens.primitive.radius.card, backgroundColor: tokens.semantic.color.backgroundSurface, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle },
  summaryValue: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 20 },
  summaryLabel: { marginTop: 2, color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_400Regular', fontSize: 11 },
  sectionTitle: { marginTop: 14, color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_600SemiBold', fontSize: 13, textTransform: 'uppercase' },
  row: { padding: 16, borderRadius: tokens.primitive.radius.card, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle, backgroundColor: tokens.semantic.color.backgroundSurface, gap: 5 },
  rowPressed: { backgroundColor: tokens.semantic.color.backgroundSurfaceMuted },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  primitive: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 11, textTransform: 'uppercase' },
  status: { color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_600SemiBold', fontSize: 11 },
  statement: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 16, lineHeight: 24 },
  supporting: { color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_400Regular', fontSize: 13 },
  responses: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
});
