import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { useSession } from '@/features/auth/ui/session-provider';
import {
  confirmIntent,
  fetchPublicIntent,
  fetchViewerHasConfirmed,
} from '@/features/sharing/data/public-intent-repository';
import {
  buildShareMessage,
  buildShareUrl,
  describeConfirmations,
  isOpenForResponse,
  type PublicIntent,
} from '@/features/sharing/domain/public-intent';

const SHARE_ORIGIN = 'https://nearcast.app';

type ViewState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'missing' }
  | { status: 'ready'; intent: PublicIntent; hasConfirmed: boolean };

/**
 * The public intent link.
 *
 * Reachable without an account, per MUST-022, and backed only by
 * `get_public_intent`. Confirming requires a signed-in member, so an anonymous
 * reader is offered sign-in rather than a control that would fail.
 */
export default function PublicIntentScreen() {
  const { shareSlug } = useLocalSearchParams<{ shareSlug: string }>();
  const { membership } = useSession();
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [isConfirming, setIsConfirming] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const intent = await fetchPublicIntent(shareSlug);
        if (cancelled) return;

        if (intent === null) {
          setState({ status: 'missing' });
          return;
        }

        const hasConfirmed = await fetchViewerHasConfirmed(intent.id);
        if (cancelled) return;

        setState({ status: 'ready', intent, hasConfirmed });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [shareSlug, reloadToken]);

  const confirm = useCallback(async () => {
    if (state.status !== 'ready') return;

    setIsConfirming(true);

    try {
      const result = await confirmIntent(state.intent.shareSlug);

      setState({
        status: 'ready',
        intent: { ...state.intent, confirmationCount: result.confirmationCount },
        hasConfirmed: result.viewerHasConfirmed,
      });
    } catch {
      setState({ status: 'error' });
    } finally {
      setIsConfirming(false);
    }
  }, [state]);

  const share = useCallback(async () => {
    if (state.status !== 'ready') return;

    const url = buildShareUrl(state.intent.shareSlug, SHARE_ORIGIN);

    // Nearcast never learns where this goes, which is the point.
    await Share.share({ message: buildShareMessage(state.intent, url), url });
  }, [state]);

  if (state.status === 'loading') {
    return (
      <Centered>
        <ActivityIndicator color={tokens.semantic.color.actionPrimary} />
      </Centered>
    );
  }

  if (state.status === 'missing') {
    return (
      <Centered>
        <Text style={styles.title}>This intent is no longer available</Text>
        <Text style={styles.body}>
          It may have expired, been withdrawn, or its link switched off.
        </Text>
      </Centered>
    );
  }

  if (state.status === 'error') {
    return (
      <Centered>
        <Text style={styles.title}>We could not load this</Text>
        <Text style={styles.body}>Check your connection and try again.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={() => setReloadToken((token) => token + 1)}>
          <Text style={styles.linkAction}>Try again</Text>
        </Pressable>
      </Centered>
    );
  }

  const { intent, hasConfirmed } = state;
  const isOpen = isOpenForResponse(intent, new Date());

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>
          {intent.broadcasterFirstName === null
            ? 'Someone nearby'
            : `${intent.broadcasterFirstName} nearby`}
        </Text>
        <Text accessibilityRole="header" style={styles.statement}>
          {intent.statement}
        </Text>

        {intent.approximatePlace !== null && (
          <Text style={styles.body}>Around {intent.approximatePlace}</Text>
        )}

        <Text accessibilityLabel="Confirmation status" style={styles.confirmations}>
          {describeConfirmations(intent.confirmationCount, hasConfirmed)}
        </Text>

        {!isOpen && <Text style={styles.closed}>This intent has expired.</Text>}

        {isOpen && membership === 'member' && !hasConfirmed && (
          <Button
            disabled={isConfirming}
            label={isConfirming ? 'Confirming' : 'Confirm this is genuine'}
            onPress={() => void confirm()}
          />
        )}

        {isOpen && membership !== 'member' && (
          <>
            <Text style={styles.body}>
              Sign in to confirm this intent or respond to it.
            </Text>
            <Button label="Sign in to Nearcast" onPress={() => router.push('/sign-in')} />
          </>
        )}

        <Pressable accessibilityRole="button" accessibilityLabel="Share" onPress={() => void share()}>
          <Text style={styles.linkAction}>Share this link</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.centered}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: tokens.primitive.space[2],
    justifyContent: 'center',
    paddingHorizontal: tokens.primitive.space[8],
  },
  content: {
    gap: tokens.primitive.space[3],
    paddingHorizontal: tokens.primitive.space[5],
    paddingTop: tokens.primitive.space[8],
    paddingBottom: tokens.primitive.space[8],
  },
  eyebrow: {
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
  },
  statement: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_700Bold',
    fontSize: tokens.typography.title2.fontSize,
    lineHeight: tokens.typography.title2.lineHeight,
  },
  title: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.bodyStrong.fontSize,
    textAlign: 'center',
  },
  body: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.body.fontSize,
    lineHeight: tokens.typography.body.lineHeight,
    textAlign: 'center',
  },
  confirmations: {
    color: tokens.semantic.color.trustText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
  },
  closed: {
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
  },
  linkAction: {
    color: tokens.semantic.color.actionPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
    paddingVertical: tokens.primitive.space[3],
  },
});
