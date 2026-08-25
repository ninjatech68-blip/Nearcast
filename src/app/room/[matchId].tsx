import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatePanel, type ScreenState } from '@/design-system/components/state-panel';
import { tokens } from '@/design-system/tokens';
import { useSession } from '@/features/auth/session';
import {
  blockUser,
  fetchRoom,
  releaseField,
  reportUser,
  sendRoomMessage,
  RELEASABLE_FIELDS,
  type Room,
} from '@/features/coordination/queries';
import { STATUS_LABELS } from '@/features/intents/data/activity-queries';

type RoomState = { kind: 'content'; room: Room } | ScreenState;

const FIELD_LABELS: Record<string, string> = {
  exact_address: 'Exact address',
  private_contact: 'Contact details',
  coordination_notes: 'Coordination notes',
  exact_geography: 'Exact location',
};

/**
 * The temporary coordination room. The governing intent stays pinned at the
 * top, messages are persisted before display, block and report are always one
 * tap away, and private fields appear only after the broadcaster explicitly
 * releases them. No typing indicators, presence, or media — out of MVP scope.
 */
export default function RoomScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const room = useQuery({
    queryKey: ['room', matchId],
    queryFn: () => fetchRoom(matchId ?? '', userId ?? ''),
    enabled: userId !== null,
    // Realtime channels are a later item (#6); a slow poll keeps the room
    // usable for testing until then. PostgreSQL remains the source of truth.
    refetchInterval: 5000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['room', matchId] });

  const send = useMutation({
    mutationFn: (body: string) =>
      sendRoomMessage(
        room.data?.state === 'ok' ? (room.data.data?.conversationId ?? '') : '',
        body,
        globalThis.crypto.randomUUID(),
      ),
    onSuccess: async (result) => {
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setNotice(null);
      setDraft('');
      await refresh();
    },
  });

  const release = useMutation({
    mutationFn: (fieldName: string) => releaseField(matchId ?? '', fieldName),
    onSuccess: async (result) => {
      setNotice(result.ok ? null : result.message);
      await refresh();
    },
  });

  const state: RoomState = room.isPending
    ? { kind: 'loading' }
    : room.isError || !room.data || room.data.state === 'error'
      ? { kind: 'error', message: 'We could not load this room. Try again.' }
      : room.data.data === null
        ? { kind: 'restricted', message: 'This information is not available to you.' }
        : { kind: 'content', room: room.data.data };

  if (state.kind !== 'content') {
    return (
      <SafeAreaView style={styles.screen}>
        <BackBar />
        <StatePanel onRetry={() => void room.refetch()} state={state} />
      </SafeAreaView>
    );
  }

  const current = state.room;
  const statusCopy = STATUS_LABELS[current.intentStatus];
  const unreleased = RELEASABLE_FIELDS.filter(
    (field) => !current.released.some((released) => released.fieldName === field.fieldName),
  );

  async function protect(action: 'block' | 'report') {
    if (!userId) return;
    const result =
      action === 'block'
        ? await blockUser(userId, current.counterpartId)
        : await reportUser(current.counterpartId);
    setNotice(
      result.ok
        ? action === 'block'
          ? 'You will no longer see or receive intents, responses, or messages from this person.'
          : 'Report received. We have preserved the relevant information for review. You can also block this person now.'
        : result.message,
    );
    await refresh();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <SafeAreaView style={styles.screen}>
        <BackBar />

        <View style={styles.pinned} testID="intent-status-header">
          <Text style={styles.pinnedStatement}>{current.intentStatement}</Text>
          <Text style={styles.pinnedStatus}>
            {statusCopy.label} · {statusCopy.supporting}
          </Text>
          <Text style={styles.pinnedWith}>Coordinating with {current.counterpartName}</Text>
        </View>

        {current.released.length > 0 ? (
          <View style={styles.released} testID="released-fields">
            {current.released.map((field) => (
              <Text key={field.fieldName} style={styles.releasedLine}>
                {FIELD_LABELS[field.fieldName] ?? field.fieldName}: {field.fieldValue}
              </Text>
            ))}
          </View>
        ) : null}

        {current.isBroadcaster && unreleased.length > 0 && !current.closed ? (
          <View style={styles.releaseRow}>
            {unreleased.map((field) => (
              <Pressable
                accessibilityRole="button"
                disabled={release.isPending}
                key={field.fieldName}
                onPress={() => release.mutate(field.fieldName)}
                style={({ pressed }) => [styles.releaseChip, pressed && styles.releaseChipPressed]}>
                <Text style={styles.releaseChipLabel}>{field.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.messages}>
          {current.messages.length === 0 ? (
            <Text style={styles.emptyRoom}>
              No messages yet. Only the two of you can read this room.
            </Text>
          ) : (
            current.messages.map((message) => (
              <View
                key={message.id}
                style={[styles.bubble, message.isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={message.isMine ? styles.bubbleMineText : styles.bubbleTheirsText}>
                  {message.body}
                </Text>
              </View>
            ))
          )}
          {notice ? (
            <Text accessibilityRole="alert" style={styles.notice}>
              {notice}
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.safetyRow}>
          <Pressable accessibilityRole="button" onPress={() => void protect('report')}>
            <Text style={styles.safetyLabel}>Report</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void protect('block')}>
            <Text style={styles.safetyLabel}>Block</Text>
          </Pressable>
        </View>

        {current.closed ? (
          <View style={styles.footer}>
            <Text style={styles.closed}>This intent is closed, so the room is read-only.</Text>
          </View>
        ) : (
          <View style={styles.footer}>
            <TextInput
              accessibilityLabel="Message"
              maxLength={2000}
              multiline
              onChangeText={setDraft}
              placeholder="Message"
              placeholderTextColor={tokens.semantic.color.textMuted}
              style={styles.input}
              value={draft}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: draft.trim().length === 0 || send.isPending }}
              disabled={draft.trim().length === 0 || send.isPending}
              onPress={() => send.mutate(draft)}
              style={({ pressed }) => [
                styles.send,
                pressed && styles.sendPressed,
                (draft.trim().length === 0 || send.isPending) && styles.sendDisabled,
              ]}>
              <Text style={styles.sendLabel}>Send</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  pinned: { marginHorizontal: 16, padding: 14, borderRadius: tokens.primitive.radius.card, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle, backgroundColor: tokens.semantic.color.backgroundSurface, gap: 3 },
  pinnedStatement: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 16, lineHeight: 22 },
  pinnedStatus: { color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  pinnedWith: { color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_400Regular', fontSize: 13 },
  released: { marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: tokens.primitive.radius.row, backgroundColor: tokens.semantic.color.backgroundSuccess, gap: 3 },
  releasedLine: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18 },
  releaseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginTop: 8 },
  releaseChip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: tokens.primitive.radius.pill, borderWidth: 1, borderColor: tokens.semantic.color.actionPrimary },
  releaseChipPressed: { backgroundColor: tokens.semantic.color.backgroundSuccess },
  releaseChipLabel: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  messages: { padding: 16, gap: 8, flexGrow: 1 },
  emptyRoom: { color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_400Regular', fontSize: 13, textAlign: 'center', marginTop: 16 },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: tokens.primitive.radius.row },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: tokens.semantic.color.actionPrimary },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: tokens.semantic.color.backgroundSurface, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle },
  bubbleMineText: { color: tokens.semantic.color.onPrimary, fontFamily: 'Manrope_400Regular', fontSize: 16, lineHeight: 22 },
  bubbleTheirsText: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_400Regular', fontSize: 16, lineHeight: 22 },
  notice: { marginTop: 8, color: tokens.semantic.color.statusWarning, fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18 },
  safetyRow: { flexDirection: 'row', gap: 20, paddingHorizontal: 20, paddingBottom: 6 },
  safetyLabel: { color: tokens.semantic.color.statusDanger, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  footer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: tokens.semantic.color.borderSubtle },
  input: { flex: 1, minHeight: 48, maxHeight: 120, paddingHorizontal: 14, paddingVertical: 12, borderRadius: tokens.component.input.radius, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle, backgroundColor: tokens.semantic.color.backgroundSurface, fontFamily: 'Manrope_400Regular', fontSize: 16, color: tokens.semantic.color.textPrimary },
  send: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: tokens.primitive.radius.button, backgroundColor: tokens.semantic.color.actionPrimary },
  sendPressed: { backgroundColor: tokens.semantic.color.actionPrimaryPressed },
  sendDisabled: { opacity: 0.45 },
  sendLabel: { color: tokens.semantic.color.onPrimary, fontFamily: 'Manrope_700Bold', fontSize: 16 },
  closed: { color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_400Regular', fontSize: 13 },
});
