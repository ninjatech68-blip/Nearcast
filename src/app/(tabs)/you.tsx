import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatePanel, type ScreenState } from '@/design-system/components/state-panel';
import { tokens } from '@/design-system/tokens';
import { useSession } from '@/features/auth/session';
import { deleteAccount } from '@/features/coordination/queries';
import { clearDraft } from '@/features/intents/data/draft-store';
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

        <DeleteAccountSection onDeleted={() => void signOut()} />
      </ScrollView>
    </Frame>
  );
}

/**
 * In-product account deletion (MUST-004): a two-step confirmation stating
 * plainly what is removed, what is preserved, and that it cannot be undone.
 */
function DeleteAccountSection({ onDeleted }: { onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setDeleting(true);
    setError(null);
    const result = await deleteAccount();
    setDeleting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    // Deletion covers what is on this device too: an unpublished draft is the
    // person's own text and must not outlive their account.
    clearDraft();
    onDeleted();
  }

  if (!confirming) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setConfirming(true)}
        style={({ pressed }) => [styles.deleteEntry, pressed && styles.deleteEntryPressed]}>
        <Text style={styles.deleteEntryLabel}>Delete account</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.deleteConfirm} testID="delete-confirm">
      <Text style={styles.deleteTitle}>Delete your account?</Text>
      <Text style={styles.deleteBody}>
        Your profile is anonymized, open intents are withdrawn, exact locations and contact
        details are removed, and messages you sent are redacted. Safety reports you filed are
        preserved. This cannot be undone.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={styles.deleteError}>
          {error}
        </Text>
      ) : null}
      <View style={styles.deleteActions}>
        <Pressable
          accessibilityRole="button"
          disabled={deleting}
          onPress={() => void remove()}
          style={({ pressed }) => [styles.deleteConfirmButton, pressed && styles.deleteConfirmPressed]}>
          <Text style={styles.deleteConfirmLabel}>
            {deleting ? 'Deleting…' : 'Delete my account'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={deleting}
          onPress={() => setConfirming(false)}
          style={({ pressed }) => [styles.deleteCancel, pressed && styles.deleteCancelPressed]}>
          <Text style={styles.deleteCancelLabel}>Keep my account</Text>
        </Pressable>
      </View>
    </View>
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
  deleteEntry: { marginTop: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.primitive.radius.button, borderWidth: 1, borderColor: tokens.semantic.color.statusDanger },
  deleteEntryPressed: { backgroundColor: tokens.semantic.color.backgroundDanger },
  deleteEntryLabel: { color: tokens.semantic.color.statusDanger, fontFamily: 'Manrope_600SemiBold', fontSize: 16 },
  deleteConfirm: { marginTop: 12, padding: 16, borderRadius: tokens.primitive.radius.card, backgroundColor: tokens.semantic.color.backgroundDanger, gap: 8 },
  deleteTitle: { color: tokens.semantic.color.statusDanger, fontFamily: 'Manrope_700Bold', fontSize: 16 },
  deleteBody: { color: tokens.semantic.color.statusDanger, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18 },
  deleteError: { color: tokens.semantic.color.statusDanger, fontFamily: 'Manrope_700Bold', fontSize: 13 },
  deleteActions: { flexDirection: 'row', gap: 10 },
  deleteConfirmButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.primitive.radius.button, backgroundColor: tokens.semantic.color.statusDanger },
  deleteConfirmPressed: { opacity: 0.85 },
  deleteConfirmLabel: { color: tokens.semantic.color.onDanger, fontFamily: 'Manrope_700Bold', fontSize: 16 },
  deleteCancel: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.primitive.radius.button, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle, backgroundColor: tokens.semantic.color.backgroundSurface },
  deleteCancelPressed: { backgroundColor: tokens.semantic.color.backgroundSurfaceMuted },
  deleteCancelLabel: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 16 },
});
