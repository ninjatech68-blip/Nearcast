import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import { QUALIFICATION_LABELS } from '@/features/responses/domain/response-draft';
import {
  acceptResponse,
  declineResponse,
  fetchInbox,
  type InboxResponse,
} from '@/features/responses/inbox/data/inbox-repository';
import {
  availableDecisions,
  describeResponseStatus,
  listClaims,
  type InboxDecision,
} from '@/features/responses/inbox/domain/inbox';

type InboxState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; responses: InboxResponse[] };

const DECISION_LABELS: Record<InboxDecision, string> = {
  accept: 'Accept',
  decline: 'Decline',
};

/**
 * The broadcaster inbox. Every response to the viewer's own intents, in the
 * order they arrived. Responses are not ranked or scored: this is a request for
 * help, not a competition the respondents cannot see they are in.
 */
export default function ActivityScreen() {
  const [state, setState] = useState<InboxState>({ status: 'loading' });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const responses = await fetchInbox();
        if (!cancelled) setState({ status: 'ready', responses });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const decide = useCallback(
    async (response: InboxResponse, decision: InboxDecision) => {
      setBusy(response.id);
      setNotice(null);

      try {
        if (decision === 'accept') {
          await acceptResponse(response.id, response.intentStatus);
          setNotice('Accepted. Your coordination room is open in Messages.');
        } else {
          await declineResponse(response.id, 'pending');
        }

        setReloadToken((token) => token + 1);
      } catch {
        setNotice('That response changed somewhere else. We reloaded your inbox.');
        setReloadToken((token) => token + 1);
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Responses
        </Text>

        {notice !== null && (
          <Text accessibilityRole="alert" style={styles.notice}>
            {notice}
          </Text>
        )}

        {state.status === 'loading' && (
          <ActivityIndicator color={tokens.semantic.color.actionPrimary} />
        )}

        {state.status === 'error' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try loading your responses again"
            onPress={() => setReloadToken((token) => token + 1)}>
            <Text style={styles.retry}>
              We could not load your responses. Tap to try again.
            </Text>
          </Pressable>
        )}

        {state.status === 'ready' && state.responses.length === 0 && (
          <Text style={styles.empty}>
            No responses yet. You will see them here as they arrive.
          </Text>
        )}

        {state.status === 'ready' &&
          state.responses.map((response) => {
            const decisions = availableDecisions(
              response.status,
              response.intentStatus === 'live',
            );
            const claims = listClaims(response.qualification, QUALIFICATION_LABELS);

            return (
              <View key={response.id} style={styles.card}>
                <Text style={styles.intent}>{response.intentStatement}</Text>
                <Text style={styles.from}>{response.respondentFirstName}</Text>
                <Text style={styles.message}>{response.message}</Text>

                {claims.map((claim) => (
                  <Text key={claim} style={styles.claim}>
                    {claim}
                  </Text>
                ))}

                <Text style={styles.status}>
                  {describeResponseStatus(response.status)}
                </Text>

                {decisions.length > 0 && (
                  <View style={styles.actions}>
                    {decisions.map((decision) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${DECISION_LABELS[decision]} ${response.respondentFirstName}`}
                        accessibilityState={{ disabled: busy !== null }}
                        disabled={busy !== null}
                        key={decision}
                        onPress={() => void decide(response, decision)}
                        style={[
                          styles.action,
                          decision === 'accept' && styles.actionPrimary,
                        ]}>
                        <Text
                          style={[
                            styles.actionText,
                            decision === 'accept' && styles.actionTextPrimary,
                          ]}>
                          {busy === response.id ? 'Working' : DECISION_LABELS[decision]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {response.status === 'accepted' && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open messages"
                    onPress={() => router.push('/messages')}>
                    <Text style={styles.link}>Open your coordination room</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: {
    gap: tokens.primitive.space[4],
    paddingHorizontal: tokens.primitive.space[5],
    paddingTop: tokens.primitive.space[3],
    paddingBottom: tokens.primitive.space[8],
  },
  title: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_700Bold',
    fontSize: tokens.typography.title1.fontSize,
    lineHeight: tokens.typography.title1.lineHeight,
  },
  card: {
    backgroundColor: tokens.semantic.color.backgroundSurface,
    borderColor: tokens.semantic.color.borderDefault,
    borderRadius: tokens.primitive.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: tokens.primitive.space[1],
    padding: tokens.primitive.space[4],
  },
  intent: {
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
  },
  from: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.bodyStrong.fontSize,
  },
  message: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.body.fontSize,
    lineHeight: tokens.typography.body.lineHeight,
    marginTop: tokens.primitive.space[1],
  },
  claim: {
    color: tokens.semantic.color.trustText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
  },
  status: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
    marginTop: tokens.primitive.space[2],
  },
  actions: { flexDirection: 'row', gap: tokens.primitive.space[2], marginTop: tokens.primitive.space[2] },
  action: {
    backgroundColor: tokens.semantic.color.backgroundSubtle,
    borderRadius: tokens.primitive.radius.pill,
    paddingHorizontal: tokens.primitive.space[5],
    paddingVertical: tokens.primitive.space[2],
  },
  actionPrimary: { backgroundColor: tokens.semantic.color.actionPrimary },
  actionText: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
  },
  actionTextPrimary: { color: tokens.primitive.color.stone0 },
  link: {
    color: tokens.semantic.color.actionPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
    paddingVertical: tokens.primitive.space[2],
  },
  empty: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.body.fontSize,
    lineHeight: tokens.typography.body.lineHeight,
  },
  notice: {
    color: tokens.semantic.color.trustText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
  },
  retry: {
    color: tokens.semantic.color.dangerText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.label.fontSize,
  },
});
