import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarButton } from '@/design-system/components/button';
import { SheetShell } from '@/design-system/components/sheet';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { useMe } from '@/features/me/me-store';
import { track } from '@/features/analytics/track';
import { describeConfirmations } from '@/features/sharing/share-link';
import {
  confirmPublicCast,
  fetchPublicCast,
  hasViewerConfirmed,
  type PublicCast,
} from '@/features/sharing/remote-share';

type State =
  | { status: 'loading' }
  | { status: 'gone' }
  | { status: 'ready'; cast: PublicCast; count: number; mine: boolean };

/**
 * A shared cast, opened from a link.
 *
 * The only screen in the app a stranger can reach. MUST-022 requires a link
 * recipient to see the cast before installing anything, so this route is
 * excused from the sign-in gate and reads through `get_public_intent`, the
 * one query granted to `anon`.
 *
 * What it shows is bounded by that projection: a statement, an approximate
 * area, a first name if the caster allowed one, and how many people
 * confirmed. Not who confirmed. A recipient learns the cast has support
 * without learning who stands behind it, which is the whole point of
 * letting an intent leave a closed group.
 */
export default function SharedCastScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const me = useMe();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const cast = await fetchPublicCast(slug ?? '');

      if (cancelled) return;
      if (!cast) {
        setState({ status: 'gone' });
        return;
      }

      // Only a signed-in member has a confirmation of their own to find.
      const mine = me.signedIn ? await hasViewerConfirmed(slug ?? '') : false;

      if (!cancelled) {
        setState({ status: 'ready', cast, count: cast.confirmationCount, mine });
        void track('intent_link_opened', {
          intent_id: cast.id,
          authenticated: me.signedIn,
          referrer_class: 'share_link',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, me.signedIn]);

  const confirm = useCallback(async () => {
    if (state.status !== 'ready' || confirming) return;

    haptic('selection');
    setConfirming(true);
    setProblem(null);

    const result = await confirmPublicCast(state.cast.shareSlug);

    if (result.kind === 'confirmed') {
      setState({ ...state, count: result.count, mine: true });
      // A bucket, not a position: "you were the third" is a fact about the
      // circle's size, and the circle stays private.
      void track('origin_confirmation_submitted', {
        intent_id: state.cast.id,
        confirmation_position_bucket: result.count === 1 ? 'first' : 'later',
      });
    } else if (result.kind === 'not_a_member') {
      setProblem('you need an invitation before you can confirm a cast.');
    } else {
      setProblem('we could not record that. check your connection and try again.');
    }

    setConfirming(false);
  }, [state, confirming]);

  return (
    <SheetShell title="a cast shared with you">
      {state.status === 'loading' ? (
        <View style={styles.centre}>
          <ActivityIndicator color={tokens.semantic.color.accent} />
        </View>
      ) : null}

      {state.status === 'gone' ? (
        <View style={styles.centre}>
          <Text style={styles.gone}>
            this cast is no longer open. it may have expired, been withdrawn, or the
            link may have been switched off.
          </Text>
        </View>
      ) : null}

      {state.status === 'ready' ? (
        <>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.flex}>
            <Text accessibilityRole="header" style={styles.statement}>
              {state.cast.statement}
            </Text>

            <Text style={styles.meta}>
              {[
                state.cast.casterFirstName ?? 'someone nearby',
                state.cast.area,
              ]
                .filter((part) => part)
                .join(' · ')}
            </Text>

            <Text accessibilityLabel="confirmations" style={styles.confirmations}>
              {describeConfirmations(state.count, state.mine)}
            </Text>

            <Text style={styles.privacy}>
              you are seeing this because someone shared the link. where it came
              from stays private, and so does who confirmed it.
            </Text>

            {problem === null ? null : (
              <Text accessibilityRole="alert" style={styles.problem}>
                {problem}
              </Text>
            )}
          </ScrollView>

          <View style={styles.actions}>
            {!me.signedIn ? (
              <>
                <BarButton
                  label="sign in to confirm"
                  variant="onCream"
                  onPress={() => router.push('/signin')}
                />
                <Text style={styles.footnote}>
                  nearcast is invite-only for now, so you will need an invitation too.
                </Text>
              </>
            ) : state.mine ? (
              <Text style={styles.footnote}>you confirmed this cast.</Text>
            ) : (
              <BarButton
                label={confirming ? 'confirming' : 'confirm this cast'}
                variant="onCream"
                disabled={confirming}
                onPress={() => void confirm()}
              />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="close"
              onPress={() => router.replace('/')}
            >
              <Text style={styles.close}>close</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  statement: { ...tokens.typography.title, color: tokens.semantic.color.ink, marginTop: 8 },
  meta: {
    ...tokens.typography.meta,
    color: tokens.semantic.color.textMutedOnCream,
    marginTop: 10,
  },
  confirmations: {
    ...tokens.typography.body,
    color: tokens.semantic.color.ink,
    marginTop: 20,
  },
  privacy: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    lineHeight: 19,
    color: tokens.semantic.color.textMutedOnCream,
    marginTop: 16,
  },
  problem: {
    ...tokens.typography.meta,
    color: tokens.semantic.color.accent,
    marginTop: 16,
  },
  gone: {
    ...tokens.typography.body,
    textAlign: 'center',
    color: tokens.semantic.color.textMutedOnCream,
  },
  actions: { gap: 12, paddingTop: 16 },
  footnote: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    color: tokens.semantic.color.textMutedOnCream,
  },
  close: {
    ...tokens.typography.meta,
    textAlign: 'center',
    color: tokens.semantic.color.textMutedOnCream,
  },
});
