import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatePanel, type ScreenState } from '@/design-system/components/state-panel';
import { tokens } from '@/design-system/tokens';
import { useSession } from '@/features/auth/session';
import {
  describeReliability,
  fetchProfileSummary,
  type ProfileSummary,
} from '@/features/intents/data/activity-queries';

type YouState = { kind: 'content'; profile: ProfileSummary } | ScreenState;

export default function YouScreen() {
  const { status, hasProfile, userId, signOut } = useSession();
  const enabled = status === 'signed-in' && hasProfile && userId !== null;

  const summary = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfileSummary(userId ?? ''),
    enabled,
  });

  if (!enabled) {
    return (
      <Frame>
        <StatePanel state={{ kind: 'restricted', message: 'Sign in to see your profile.' }} />
      </Frame>
    );
  }

  const state: YouState = summary.isPending
    ? { kind: 'loading' }
    : summary.isError || !summary.data || summary.data.state === 'error'
      ? { kind: 'error', message: 'We could not load your profile. Try again.' }
      : summary.data.data
        ? { kind: 'content', profile: summary.data.data }
        : { kind: 'restricted', message: 'Redeem your invitation to finish setting up.' };

  if (state.kind !== 'content') {
    return (
      <Frame>
        <StatePanel onRetry={() => void summary.refetch()} state={state} />
      </Frame>
    );
  }

  const { profile } = state;

  return (
    <Frame>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.name}>{profile.displayName}</Text>
        {profile.city ? <Text style={styles.meta}>{profile.city} area</Text> : null}

        <Text style={styles.sectionTitle}>Trust context</Text>
        <View style={styles.card}>
          {profile.reliability.length === 0 ? (
            <Text style={styles.body}>
              No confirmed interactions yet. Reliability appears once an interaction is confirmed by
              the other person.
            </Text>
          ) : (
            profile.reliability.map((entry) => (
              <Text key={entry.context} style={styles.body}>
                {entry.context}: {describeReliability(entry)}
              </Text>
            ))
          )}
          {profile.verifiedKinds.length > 0 ? (
            <Text style={styles.body}>
              {profile.verifiedKinds.join(', ')} verified. Verification does not guarantee safety.
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.card}>
          <Text style={styles.body}>People can see your first name and approximate area.</Text>
          <Text style={styles.body}>
            Only accepted respondents can see details you explicitly release.
          </Text>
          <Text style={styles.body}>Your originating group and its members remain private.</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}>
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Text accessibilityRole="header" style={styles.screenTitle}>
        You
      </Text>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundApp },
  screenTitle: { paddingHorizontal: 16, paddingTop: 12, color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 28, lineHeight: 34 },
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 10 },
  name: { marginTop: 12, color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 20 },
  meta: { color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_400Regular', fontSize: 13 },
  sectionTitle: { marginTop: 16, color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_600SemiBold', fontSize: 13, textTransform: 'uppercase' },
  card: { padding: 16, borderRadius: tokens.primitive.radius.card, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle, backgroundColor: tokens.semantic.color.backgroundSurface, gap: 8 },
  body: { color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18 },
  signOut: { marginTop: 24, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.primitive.radius.button, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle },
  signOutPressed: { backgroundColor: tokens.semantic.color.backgroundSurfaceMuted },
  signOutLabel: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 16 },
});
