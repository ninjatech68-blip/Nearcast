import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatePanel, type ScreenState } from '@/design-system/components/state-panel';
import { tokens } from '@/design-system/tokens';
import {
  describeReliability,
  fetchProfileSummary,
  type ProfileSummary,
} from '@/features/intents/data/activity-queries';

type ProfileState = { kind: 'content'; profile: ProfileSummary } | ScreenState;

export default function BroadcasterProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const summary = useQuery({
    queryKey: ['profile', id],
    queryFn: () => fetchProfileSummary(id ?? ''),
  });

  const state: ProfileState = summary.isPending
    ? { kind: 'loading' }
    : summary.isError || !summary.data || summary.data.state === 'error'
      ? { kind: 'error', message: 'We could not load this profile. Try again.' }
      : summary.data.data
        ? { kind: 'content', profile: summary.data.data }
        : { kind: 'restricted', message: 'This information is not available to you.' };

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

      {state.kind !== 'content' ? (
        <StatePanel onRetry={() => void summary.refetch()} state={state} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.name}>
            {state.profile.displayName}
          </Text>
          {state.profile.city ? (
            <Text style={styles.meta}>{state.profile.city} area</Text>
          ) : null}

          {state.profile.isRestricted ? (
            <View style={styles.restricted}>
              <Text style={styles.restrictedText}>
                Some actions are unavailable while we review a safety concern.
              </Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Trust context</Text>
          <View style={styles.card}>
            {state.profile.reliability.length === 0 ? (
              <Text style={styles.body}>No confirmed interactions yet.</Text>
            ) : (
              state.profile.reliability.map((entry) => (
                <Text key={entry.context} style={styles.body}>
                  {entry.context}: {describeReliability(entry)}
                </Text>
              ))
            )}
            {state.profile.verifiedKinds.length > 0 ? (
              <Text style={styles.body}>
                {state.profile.verifiedKinds.join(', ')} verified. Verification does not guarantee
                safety.
              </Text>
            ) : null}
          </View>

          <Text style={styles.privacy}>
            Contact details are hidden until this person chooses to share them after a match.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  backBar: { paddingHorizontal: 16, paddingVertical: 12 },
  backLabel: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
  name: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 22 },
  meta: { color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_400Regular', fontSize: 15 },
  restricted: { marginTop: 8, padding: 14, borderRadius: tokens.primitive.radius.card, backgroundColor: tokens.semantic.color.warningSurface },
  restrictedText: { color: tokens.semantic.color.warningText, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19 },
  sectionTitle: { marginTop: 16, color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_600SemiBold', fontSize: 13, textTransform: 'uppercase' },
  card: { padding: 16, borderRadius: tokens.primitive.radius.card, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, backgroundColor: tokens.semantic.color.backgroundSurface, gap: 8 },
  body: { color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20 },
  privacy: { marginTop: 12, color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19 },
});
