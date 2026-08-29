import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Face } from '@/design-system/components/face';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos, isVerified } from '@/features/casts/faces';
import {
  chatEnabled,
  endChat,
  extendChat,
  openConversation,
  retryMessage,
  sendLocationMessage,
  sendMessage,
  useThread,
  type Message,
} from '@/features/chat/chat';
import { connectivityNote } from '@/infrastructure/net/connectivity';
import { useConnectivity } from '@/infrastructure/net/submit';

/**
 * the plan room chat: opens after a match, shows the whole thread for
 * context, sends into the session store. contact details never appear
 * here — coordination happens on first names.
 */
export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const thread = useThread(id ?? '');
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const connectivity = useConnectivity();
  const netNote = connectivityNote(connectivity);

  // backend mode: load the conversation and subscribe to new messages.
  // no-op on fixtures, where the seed thread is already in the cache.
  useEffect(() => {
    if (!id) return;
    return openConversation(id);
  }, [id]);

  // while a real conversation is still loading, show a spinner rather
  // than the "not open" state, which would flash on every open.
  if (!thread && chatEnabled()) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top + 24 }]}>
        <ActivityIndicator color={tokens.semantic.color.accent} />
        <Pressable accessibilityRole="button" accessibilityLabel="back" hitSlop={12} onPress={() => router.back()}>
          <Text style={styles.back}>back</Text>
        </Pressable>
      </View>
    );
  }

  if (!thread) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.gone}>this room isn’t open.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="back" hitSlop={12} onPress={() => router.back()}>
          <Text style={styles.back}>back</Text>
        </Pressable>
      </View>
    );
  }

  async function send() {
    const text = draft.trim();
    if (!text) return;
    haptic('light');
    setSendError(null);
    setDraft('');
    try {
      await sendMessage(thread!.id, text);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {
      // keep what they typed so nothing is lost to a dropped send
      haptic('warning');
      setDraft(text);
      setSendError("that didn't send. tap send to try again.");
    }
  }

  async function shareLocation() {
    haptic('light');
    setSendError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setSendError('location is off. turn it on to share where you are.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await sendLocationMessage(thread!.id, pos.coords.latitude, pos.coords.longitude);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {
      setSendError("couldn't share your location. try again.");
    }
  }

  function addEmoji(emoji: string) {
    haptic('selection');
    setDraft((d) => d + emoji);
  }

  function openExpiryMenu() {
    if (!thread) return;
    if (thread.mode === 'ended') {
      Alert.alert('chat ended', 'this chat is closed. it cannot be reopened.', [{ text: 'ok' }]);
      return;
    }
    Alert.alert(
      'chat window',
      `currently ${thread.expiresLabel}. keep it open for as long as you both want, then end it.`,
      [
        { text: '24 hours', onPress: () => extendChat(thread.id, 'day') },
        { text: '7 days', onPress: () => extendChat(thread.id, 'week') },
        { text: 'keep open forever', onPress: () => extendChat(thread.id, 'always') },
        {
          text: 'end chat',
          style: 'destructive',
          onPress: () =>
            Alert.alert('end this chat?', 'no new messages after this. it cannot be reopened.', [
              { text: 'never mind' },
              {
                text: 'end',
                style: 'destructive',
                onPress: () => {
                  haptic('light');
                  endChat(thread.id);
                },
              },
            ]),
        },
        { text: 'cancel', style: 'cancel' as const },
      ],
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="back" hitSlop={12} onPress={() => router.back()} style={styles.backTap}>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`about ${thread.withName}`}
            onPress={() => router.push(`/caster/${thread.withId}`)}
            style={styles.who}
          >
            <Face photo={facePhotos[thread.withId]} initials={thread.withName.slice(0, 2).toUpperCase()} size={32} label="" verified={isVerified(thread.withId)} />
            <View>
              <Text style={styles.name}>{thread.withName}</Text>
              <Text style={styles.sub}>{thread.castTitle}</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="chat window options"
            hitSlop={10}
            onPress={openExpiryMenu}
            style={styles.expiryTap}
          >
            {/* the window is the whole point of the chat — a muted 11pt
                label in the corner was missed by every tester. it reads
                as an accent pill now, at the same tap target. */}
            <View style={styles.expiryPill}>
              <Text style={styles.expiryLabel}>{thread.expiresLabel}</Text>
              <Text style={styles.expiryChevron}>⋯</Text>
            </View>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.thread}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <Text style={styles.matchedNote}>you matched. earlier messages are here for context.</Text>
          {thread.messages.map((message) => (
            <Bubble
              key={message.id}
              message={message}
              onRetry={() => retryMessage(thread.id, message.id)}
            />
          ))}
        </ScrollView>

        {netNote ? (
          <View style={styles.netBanner} accessibilityLabel="connection status">
            <Text style={styles.netBannerText}>{netNote}</Text>
          </View>
        ) : null}

        {thread.mode === 'ended' ? (
          <View style={[styles.endedRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Text style={styles.endedText}>this chat has ended. no new messages.</Text>
          </View>
        ) : (
          <View style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
            {sendError ? <Text style={styles.sendError}>{sendError}</Text> : null}
            <View style={styles.emojiRow}>
              {['👍', '🙌', '😅', '🎉', '🙏', '📍'].map((emoji) =>
                emoji === '📍' ? (
                  <Pressable
                    key="loc"
                    accessibilityRole="button"
                    accessibilityLabel="share my location"
                    onPress={shareLocation}
                    style={styles.emojiChip}
                  >
                    <Text style={styles.emoji}>📍</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    key={emoji}
                    accessibilityRole="button"
                    accessibilityLabel={`add ${emoji}`}
                    onPress={() => addEmoji(emoji)}
                    style={styles.emojiChip}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </Pressable>
                ),
              )}
            </View>
            <View style={styles.composer}>
              <TextInput
                accessibilityLabel="message"
                value={draft}
                onChangeText={setDraft}
                placeholder="message"
                placeholderTextColor={tokens.semantic.color.hairlineOnCream}
                selectionColor={tokens.semantic.color.accent}
                style={styles.input}
                multiline
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="send"
                accessibilityState={{ disabled: draft.trim().length === 0 }}
                disabled={draft.trim().length === 0}
                onPress={send}
                style={[styles.sendBtn, draft.trim().length === 0 && styles.sendDim]}
              >
                <Text style={styles.sendText}>↑</Text>
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ message, onRetry }: { message: Message; onRetry?: () => void }) {
  if (message.from === 'system') {
    return (
      <View style={styles.systemRow} accessibilityLabel="chat notice">
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }
  const mine = message.from === 'me';
  const failed = mine && message.status === 'failed';

  const hasLocation = message.latitude !== undefined && message.longitude !== undefined;
  const body = (
    <>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs, failed && styles.bubbleFailed]}>
        {hasLocation ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="open shared location in maps"
            onPress={() =>
              Linking.openURL(
                Platform.OS === 'ios'
                  ? `http://maps.apple.com/?ll=${message.latitude},${message.longitude}`
                  : `geo:${message.latitude},${message.longitude}`,
              )
            }
          >
            <Text style={[styles.bubbleText, mine ? styles.mineText : styles.theirsText]}>
              📍 {message.placeLabel ?? 'shared a location'}
            </Text>
            <Text style={[styles.locHint, mine ? styles.mineText : styles.theirsText]}>tap to open in maps · approximate</Text>
          </Pressable>
        ) : (
          <Text style={[styles.bubbleText, mine ? styles.mineText : styles.theirsText]}>{message.text}</Text>
        )}
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.time}>{failed ? 'not sent · tap to retry' : message.time}</Text>
        {mine && message.status ? (
          <Text style={[styles.tick, message.status === 'read' && styles.tickRead, failed && styles.tickFailed]}>
            {tickFor(message.status)}
          </Text>
        ) : null}
      </View>
    </>
  );

  if (failed && onRetry) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`retry sending: ${message.text}`}
        onPress={onRetry}
        style={[styles.bubbleRow, styles.rowMine]}
      >
        {body}
      </Pressable>
    );
  }

  return <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>{body}</View>;
}

function tickFor(status: NonNullable<Message['status']>): string {
  return { pending: '…', sent: '✓', delivered: '✓✓', read: '✓✓', failed: '!' }[status];
}

const styles = StyleSheet.create({
  sendError: { ...tokens.typography.metaSmall, color: tokens.semantic.color.accent, paddingHorizontal: 4, paddingBottom: 6 },
  emojiRow: { flexDirection: 'row', gap: 6, paddingBottom: 8, flexWrap: 'wrap' },
  emojiChip: {
    minWidth: 40,
    height: 36,
    borderRadius: tokens.primitive.radius.pill,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  emoji: { fontSize: 18 },
  locHint: { ...tokens.typography.metaSmall, marginTop: 4, opacity: 0.8 },
  screen: { flex: 1, backgroundColor: tokens.semantic.color.cream, paddingHorizontal: 18 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  gone: { fontFamily: fontFamily.display, fontSize: 24, color: tokens.semantic.color.ink },
  back: { fontFamily: fontFamily.displaySemi, fontSize: 15, color: tokens.semantic.color.accent },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.color.hairlineOnCream,
    paddingBottom: 8,
  },
  backTap: { minWidth: 40, minHeight: 44, justifyContent: 'center' },
  chevron: { fontFamily: fontFamily.text, fontSize: 32, lineHeight: 34, color: tokens.semantic.color.ink },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  name: { fontFamily: fontFamily.displaySemi, fontSize: 16, color: tokens.semantic.color.ink },
  sub: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream },
  thread: { paddingVertical: 16, gap: 10 },
  matchedNote: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, textAlign: 'center', marginBottom: 8 },
  systemRow: {
    alignSelf: 'center',
    maxWidth: '90%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
  },
  systemText: {
    fontFamily: fontFamily.monoSemi,
    fontSize: 13,
    lineHeight: 19,
    color: tokens.semantic.color.ink,
    textAlign: 'center',
  },
  bubbleRow: { maxWidth: '82%' },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  mine: { backgroundColor: tokens.semantic.color.ink, borderBottomRightRadius: 5 },
  theirs: { backgroundColor: tokens.semantic.color.backgroundSubtle, borderBottomLeftRadius: 5 },
  bubbleText: { fontFamily: fontFamily.text, fontSize: 15, lineHeight: 21 },
  mineText: { color: tokens.semantic.color.cream },
  theirsText: { color: tokens.semantic.color.ink },
  time: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 3, marginHorizontal: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tick: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 3, marginRight: 4 },
  tickRead: { color: tokens.semantic.color.accent },
  tickFailed: { color: tokens.semantic.color.accent, fontFamily: fontFamily.monoSemi },
  bubbleFailed: { opacity: 0.55, borderWidth: 1, borderColor: tokens.semantic.color.accent },
  netBanner: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: tokens.primitive.radius.control,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
    marginBottom: 8,
  },
  netBannerText: { ...tokens.typography.metaSmall, color: tokens.semantic.color.ink, textAlign: 'center' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.hairlineOnCream,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fontFamily.text,
    fontSize: 15,
    color: tokens.semantic.color.ink,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.semantic.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDim: { opacity: 0.4 },
  sendText: { fontFamily: fontFamily.display, fontSize: 20, color: tokens.semantic.color.ink },
  expiryTap: {
    alignItems: 'flex-end',
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  expiryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: tokens.primitive.radius.pill,
    borderWidth: 1,
    borderColor: tokens.semantic.color.accent,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
  },
  expiryLabel: {
    ...tokens.typography.tagSmall,
    color: tokens.semantic.color.accent,
  },
  expiryChevron: {
    fontFamily: fontFamily.text,
    fontSize: 16,
    lineHeight: 16,
    color: tokens.semantic.color.accent,
  },
  endedRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.hairlineOnCream,
    alignItems: 'center',
  },
  endedText: {
    ...tokens.typography.metaSmall,
    color: tokens.semantic.color.textMutedOnCream,
  },
});
