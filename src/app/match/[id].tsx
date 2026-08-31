import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import { tokens } from '@/design-system/tokens';
import {
  MAX_MESSAGE_LENGTH,
  type MatchMessage,
  canSend,
  groupConsecutive,
  readStateLabel,
  statusForSend,
} from '@/features/match/domain/match-room';
import { VIEWER_ID, matchMessages, matchRoom, releasedFields } from '@/features/match/match-fixtures';
import { Group, ScreenTitle, Section, SymbolIcon } from '@/features/native-demo/native-ui';

type RoomState = 'content' | 'empty' | 'loading' | 'error' | 'restricted';

/**
 * `state` and `online` come from the route while the room is fixture-backed,
 * so every contract state stays reachable and reviewable. They are replaced by
 * the query and the real connectivity signal once the backend lands.
 */
export default function MatchRoomScreen() {
  const params = useLocalSearchParams<{ online?: string; state?: string }>();
  const roomState = (params.state ?? 'content') as RoomState;
  const online = params.online !== 'false';

  const [messages, setMessages] = useState<MatchMessage[]>(
    roomState === 'empty' ? [] : matchMessages,
  );
  const [draft, setDraft] = useState('');

  const inFlight = useMemo(() => messages.some((item) => item.status === 'sending'), [messages]);
  const sendable = canSend({ draft, inFlight });

  // Settles an optimistic send. The real transport replaces this; the states it
  // moves through are the contract.
  useEffect(() => {
    if (!inFlight) return undefined;

    const timer = setTimeout(() => {
      setMessages((current) =>
        current.map((item) => (item.status === 'sending' ? { ...item, status: 'sent' } : item)),
      );
    }, 400);

    return () => clearTimeout(timer);
  }, [inFlight]);

  const send = useCallback(() => {
    if (!canSend({ draft, inFlight })) return;

    setMessages((current) => [
      ...current,
      {
        authorId: VIEWER_ID,
        body: draft.trim(),
        id: `local-${current.length + 1}`,
        readByRecipient: false,
        sentAt: new Date().toISOString(),
        status: statusForSend(online),
      },
    ]);
    setDraft('');
  }, [draft, inFlight, online]);

  const retryQueued = useCallback(() => {
    setMessages((current) =>
      current.map((item) =>
        item.status === 'failed' || item.status === 'queued'
          ? { ...item, status: 'sending' }
          : item,
      ),
    );
  }, []);

  if (roomState === 'loading') {
    return (
      <SafeAreaView edges={['top']} style={styles.centered}>
        <ActivityIndicator color={tokens.semantic.color.actionPrimary} />
        <Text style={styles.stateBody}>Opening your room…</Text>
      </SafeAreaView>
    );
  }

  if (roomState === 'restricted') {
    return (
      <SafeAreaView edges={['top']} style={styles.centered}>
        <Text accessibilityRole="header" style={styles.stateTitle}>This room is unavailable</Text>
        <Text style={styles.stateBody}>
          Some actions are temporarily unavailable while we review a safety concern.
        </Text>
      </SafeAreaView>
    );
  }

  if (roomState === 'error') {
    return (
      <SafeAreaView edges={['top']} style={styles.centered}>
        <Text accessibilityRole="header" style={styles.stateTitle}>We could not open this room</Text>
        <Text style={styles.stateBody}>Check your connection and try again.</Text>
        <Pressable accessibilityRole="button" onPress={() => undefined} style={styles.retryButton}>
          <Text style={styles.retryLabel}>Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const groups = groupConsecutive(messages);
  const hasQueued = messages.some((item) => item.status === 'queued' || item.status === 'failed');

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag">
          <ScreenTitle>{matchRoom.hostName}</ScreenTitle>

          <View style={styles.statusHeader}>
            <Text style={styles.castTitle}>{matchRoom.castTitle}</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusChip}>
                <Text style={styles.statusChipText}>{matchRoom.status}</Text>
              </View>
              <Text style={styles.statusDetail}>{matchRoom.statusDetail}</Text>
            </View>
          </View>

          <Section title="Shared with you both">
            <Group>
              {releasedFields.map(([label, value], index) => (
                <View key={label}>
                  <View style={styles.releasedRow}>
                    <Text style={styles.releasedLabel}>{label}</Text>
                    <Text style={styles.releasedValue}>{value}</Text>
                  </View>
                  {index < releasedFields.length - 1 ? <View style={styles.divider} /> : null}
                </View>
              ))}
            </Group>
            <Text style={styles.releasedNote}>
              Anything not listed here stays private. Closing the cast ends this room.
            </Text>
          </Section>

          <Section title="Messages">
            {groups.length === 0 ? (
              <Group>
                <View style={styles.emptyRow}>
                  <Text style={styles.stateTitle}>No messages yet</Text>
                  <Text style={styles.stateBody}>
                    You are both here. Say when and where works.
                  </Text>
                </View>
              </Group>
            ) : (
              <View style={styles.messageStack}>
                {groups.map((group) => {
                  const mine = group[0].authorId === VIEWER_ID;
                  const last = group[group.length - 1];
                  const receipt = readStateLabel(last, VIEWER_ID);

                  return (
                    <View key={group[0].id} style={mine ? styles.groupMine : styles.groupTheirs}>
                      {group.map((message) => (
                        <View
                          key={message.id}
                          style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                          <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>
                            {message.body}
                          </Text>
                        </View>
                      ))}
                      {receipt ? <Text style={styles.receipt}>{receipt}</Text> : null}
                    </View>
                  );
                })}
              </View>
            )}
          </Section>

          {hasQueued ? (
            <View style={styles.queuedBanner}>
              <SymbolIcon
                color={tokens.semantic.color.warningText}
                fallback="!"
                name="exclamationmark.triangle"
                size={16}
              />
              <Text style={styles.queuedText}>
                You are offline. Messages will send when you are back.
              </Text>
              <Pressable accessibilityRole="button" onPress={retryQueued}>
                <Text style={styles.queuedAction}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Message"
            maxLength={MAX_MESSAGE_LENGTH}
            multiline
            onChangeText={setDraft}
            placeholder="Message Aarav"
            placeholderTextColor={tokens.semantic.color.textMuted}
            style={styles.input}
            value={draft}
          />
          <Pressable
            accessibilityLabel="Send message"
            accessibilityRole="button"
            accessibilityState={{ disabled: !sendable }}
            disabled={!sendable}
            onPress={send}
            style={[styles.sendButton, !sendable && styles.sendButtonDisabled]}>
            <SymbolIcon color="#FFFFFF" fallback="→" name="arrow.up" size={18} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  statusHeader: { marginTop: 10, gap: 8 },
  castTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: tokens.semantic.color.trustSurface },
  statusChipText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: tokens.semantic.color.trustText },
  statusDetail: { flex: 1, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18, color: tokens.semantic.color.textSecondary },
  releasedRow: { padding: 14, gap: 2 },
  releasedLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18, color: tokens.semantic.color.textSecondary },
  releasedValue: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  releasedNote: { marginTop: 8, paddingHorizontal: 2, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.textSecondary },
  divider: { height: 1, marginLeft: 14, backgroundColor: tokens.semantic.color.borderDefault },
  messageStack: { gap: 14 },
  groupMine: { alignItems: 'flex-end', gap: 4 },
  groupTheirs: { alignItems: 'flex-start', gap: 4 },
  bubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleMine: { backgroundColor: tokens.semantic.color.actionPrimary },
  bubbleTheirs: { borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, backgroundColor: tokens.semantic.color.backgroundSurface },
  bubbleText: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  bubbleTextMine: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 21, color: '#FFFFFF' },
  receipt: { fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 17, color: tokens.semantic.color.textSecondary },
  emptyRow: { padding: 16, gap: 4 },
  stateTitle: { textAlign: 'center', fontFamily: 'Manrope_600SemiBold', fontSize: 16, lineHeight: 22, color: tokens.semantic.color.textPrimary },
  stateBody: { textAlign: 'center', fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.textSecondary },
  retryButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 12, backgroundColor: tokens.semantic.color.actionPrimary },
  retryLabel: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: '#FFFFFF' },
  queuedBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, padding: 12, borderRadius: 12, backgroundColor: tokens.semantic.color.warningSurface },
  queuedText: { flex: 1, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18, color: tokens.semantic.color.warningText },
  queuedAction: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: tokens.semantic.color.warningText },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: tokens.semantic.color.borderDefault, backgroundColor: tokens.semantic.color.backgroundSurface },
  input: { flex: 1, minHeight: 48, maxHeight: 132, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, borderRadius: 14, fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary, backgroundColor: tokens.semantic.color.backgroundSurface },
  sendButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: tokens.semantic.color.actionPrimary },
  sendButtonDisabled: { opacity: 0.45 },
});
