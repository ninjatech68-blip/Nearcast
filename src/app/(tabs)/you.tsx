import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { fetchMyProfile, signOut, type MyProfile } from '@/features/auth/data/auth-repository';
import { Group, IconLine, ScreenTitle, Section } from '@/features/native-demo/native-ui';

type ProfileState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; profile: MyProfile | null };

/**
 * You.
 *
 * Your own name and area, and the way out. Nothing here is a score or a count:
 * contextual reliability history is Plan 05 work, and a placeholder number
 * would be a fabricated one.
 *
 * Signing out needs no navigation of its own. The session provider follows
 * Supabase auth changes, so membership resolves to signed out and the redirect
 * rules move the person to sign-in — the same path an expired session takes.
 */
export default function YouScreen() {
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const profile = await fetchMyProfile();
        if (!cancelled) setState({ status: 'ready', profile });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function leave() {
    setIsLeaving(true);

    try {
      await signOut();
    } finally {
      setIsLeaving(false);
    }
  }

  const profile = state.status === 'ready' ? state.profile : null;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle>You</ScreenTitle>

        <Section>
          <Group>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsFor(profile)}</Text>
              </View>
              <View style={styles.copy}>
                {state.status === 'loading' && (
                  <ActivityIndicator color={tokens.semantic.color.actionPrimary} />
                )}

                {state.status === 'error' && (
                  <Text style={styles.meta}>We could not load your profile.</Text>
                )}

                {state.status === 'ready' && (
                  <>
                    <Text style={styles.name}>
                      {profile?.displayName ?? 'Your profile'}
                    </Text>
                    <Text style={styles.meta}>
                      {profile?.homeArea ?? 'No area chosen yet'}
                    </Text>
                  </>
                )}

                <IconLine
                  fallback="P"
                  icon="lock"
                  text="Your area stays approximate. Nobody sees where you are."
                />
              </View>
            </View>
          </Group>
        </Section>

        <Section title="Account">
          <Group>
            <View style={styles.actions}>
              <Button
                label="Sign out"
                loading={isLeaving}
                onPress={() => void leave()}
              />
              <Text style={styles.note}>
                Signs out on this device only. Any draft saved here is discarded.
              </Text>
            </View>
          </Group>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Initials from a real name, and a neutral mark when there is not one yet. */
function initialsFor(profile: MyProfile | null): string {
  if (profile === null) return '—';

  const parts = profile.displayName.trim().split(/\s+/).slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '—';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  profileRow: { flexDirection: 'row', gap: 16, padding: 16 },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.semantic.color.trustSurface },
  avatarText: { fontFamily: 'Manrope_700Bold', fontSize: 24, color: tokens.semantic.color.trustText },
  copy: { flex: 1, gap: 2 },
  name: { fontFamily: 'Manrope_700Bold', fontSize: 22, lineHeight: 28, color: tokens.semantic.color.textPrimary },
  meta: { fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.textMuted },
  actions: { gap: 10, padding: 16 },
  note: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18, color: tokens.semantic.color.textMuted },
});
