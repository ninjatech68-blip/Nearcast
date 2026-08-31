import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Animated,
  Keyboard,
} from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Face } from '@/design-system/components/face';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos, isVerified } from '@/features/casts/faces';
import {
  answerWindowRequest,
  chatEnabled,
  chatPollInterval,
  endChat,
  keepConversationOpen,
  releaseConversation,
  extendChat,
  loadOlderConversationMessages,
  openConversation,
  refreshConversationMessages,
  retryMessage,
  sendMessage,
  useThread,
  type LocalMedia,
  type Message,
} from '@/features/chat/chat';
import { usePoll } from '@/infrastructure/net/use-poll';
import { setPendingMedia } from '@/features/chat/pending-media';
import { MessageList } from '@/features/chat/ui/message-list';
import { fetchMessageMeta, toggleReaction, type MessageMeta } from '@/features/chat/remote-chat';
import { countdownLabel, countdownTickMs } from '@/features/chat/countdown';
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
  const [sendError, setSendError] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [messageMeta, setMessageMeta] = useState<MessageMeta[]>([]);

  /**
   * The room's reply and reaction map.
   *
   * Kept beside the messages rather than folded into them: the three message
   * readers carry receipt derivation and tie-breaking that three test files
   * pin down, and widening them to add two fields is how paging quietly
   * breaks. Only messages with something to say come back, so a room with
   * neither costs one empty result.
   */
  const refreshMeta = useCallback(async () => {
    if (!id) return;
    try {
      setMessageMeta(await fetchMessageMeta(id));
    } catch {
      // Reactions and quotes are decoration on a working thread. A failure
      // here must not take the conversation down with it.
    }
  }, [id]);
  const loadingOlderRef = useRef(false);
  const connectivity = useConnectivity();
  const netNote = connectivityNote(connectivity);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // backend mode: load the conversation and subscribe to new messages.
  // no-op on fixtures, where the seed thread is already in the cache.
  useEffect(() => {
    if (!id) return;
    return openConversation(id);
  }, [id]);

  // the floor under realtime: even if the socket never connects, poll
  // this thread while it is open and the app is foregrounded, so new
  // messages land in a couple of seconds without a manual pull. Each
  // tick is a real round-trip, so this is as fast as is worth paying
  // for, and it stops the moment the app backgrounds (see usePoll).
  usePoll(
    () => {
      if (id) {
        void refreshConversationMessages(id);
        void refreshMeta();
      }
    },
    chatPollInterval,
    chatEnabled() && !!id,
  );

  // Tell the server this chat is on screen, so it does not push a
  // notification for a message the person is watching arrive. The lease
  // is 30s and this renews every 10, so a dropped call is invisible.
  usePoll(
    () => {
      if (id) void keepConversationOpen(id);
    },
    10_000,
    chatEnabled() && !!id,
  );

  // Backgrounding has to say so out loud. usePoll stops renewing, but
  // the lease already granted still covers the next 30 seconds — long
  // enough to swallow the first ping of a chat someone left open and
  // walked away from, which is the ordinary way to leave a chat.
  // Coming back needs nothing here: usePoll re-fires on foreground.
  useEffect(() => {
    if (!id || !chatEnabled()) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') void releaseConversation(id);
    });
    return () => sub.remove();
  }, [id]);

  // re-render the countdown on a cadence that matches how close it is:
  // by the minute normally, twice a minute inside the final hour. cheap,
  // and it stops the header showing a number frozen at load.
  const [tick, setTick] = useState(0);
  const expiresAt = thread?.expiresAt ?? null;
  const chatMode = thread?.mode;
  useEffect(() => {
    if (chatMode === 'always' || chatMode === 'ended' || !expiresAt) return;
    const id = setInterval(() => setTick((n) => n + 1), countdownTickMs(expiresAt));
    return () => clearInterval(id);
  }, [expiresAt, chatMode]);
  const expiryText = thread ? countdownLabel(thread.mode, thread.expiresAt) : '';
  void tick;

  async function loadEarlier() {
    if (!id || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      await loadOlderConversationMessages(id);
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }

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

  /**
   * Send, optionally quoting a message.
   *
   * The composer belongs to the chat library now, so a failure can no longer
   * be handled by putting the text back in a field this screen owns. The
   * message is already in the thread as `failed` — the transport puts it there
   * — so the recovery is the retry on that bubble, and this only has to say
   * that something went wrong.
   */
  async function sendWithReply(text: string, replyToId: string | null) {
    const trimmed = text.trim();
    if (!trimmed) return;

    haptic('light');
    setAttachOpen(false);
    setSendError(null);

    try {
      await sendMessage(thread!.id, trimmed, replyToId);
    } catch {
      haptic('warning');
      setSendError("that didn't send. long-press the message to try again.");
    }
  }

  /**
   * A reaction, toggled.
   *
   * The server does the toggling in one round trip and hands back the message's
   * new set, so this refreshes the room's map rather than guessing at the
   * result — a reaction the other person added between the tap and the reply
   * would otherwise disappear.
   */
  async function react(messageId: string, emoji: string) {
    try {
      await toggleReaction(messageId, emoji);
      await refreshMeta();
    } catch {
      haptic('warning');
    }
  }

  function openMedia(message: Message) {
    router.push(
      `/media-view?path=${encodeURIComponent(message.mediaPath ?? '')}&kind=${message.mediaKind ?? 'image'}`,
    );
  }

  /**
   * The + menu.
   *
   * It was the platform action sheet, which on this OS version draws a
   * centred dialog of stacked capsules — it read as an error alert
   * interrupting the chat rather than as a tray belonging to it. This
   * is an in-app tray instead: it opens between the thread and the
   * composer, the way every messaging app does it, so the conversation
   * stays visible behind what you are about to add to it.
   *
   * Deliberately NOT a native Modal: presenting the camera or photo
   * picker while a modal is dismissing is a known way to get nothing at
   * all on iOS, and an in-line tray has no dismissal to race.
   */
  function toggleAttachTray() {
    haptic('light');
    Keyboard.dismiss();
    setAttachOpen((open) => !open);
  }

  function chooseAttachment(kind: 'camera' | 'library' | 'location') {
    setAttachOpen(false);
    if (kind === 'location') {
      // a map picker, not an outright current-location send: you are
      // usually planning a spot you are not standing in.
      router.push(`/pick-location?conversation=${thread!.id}`);
      return;
    }
    void pickMedia(kind);
  }

  async function pickMedia(source: 'camera' | 'library') {
    setSendError(null);
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSendError(
          source === 'camera'
            ? 'camera access is off. turn it on to take a photo.'
            : 'photo access is off. turn it on to send a picture.',
        );
        return;
      }
      // NO allowsEditing: the cropper re-encodes, and a re-encoded GIF
      // is a still frame. quality < 1 because a 12MP photo is not worth
      // the upload on mobile data; it does not touch a GIF, copied as
      // picked. The library allows up to five at once.
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.75, exif: false })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.75,
              exif: false,
              allowsMultipleSelection: true,
              selectionLimit: 5,
              preferredAssetRepresentationMode:
                ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
            });
      if (result.canceled || result.assets.length === 0) return;
      const items: LocalMedia[] = result.assets.slice(0, 5).map((asset) => ({
        uri: asset.uri,
        kind: isGif(asset.uri, asset.mimeType) ? 'gif' : 'image',
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
      }));
      // hand off to a preview screen: nothing is sent until the person
      // confirms there, where they can also caption it or back out.
      setPendingMedia({ conversationId: thread!.id, items });
      router.push(`/media-send?conversation=${thread!.id}`);
    } catch {
      haptic('warning');
      setSendError("that didn't pick. try again.");
    }
  }

  function openExpiryMenu() {
    if (!thread) return;
    if (thread.mode === 'ended') {
      Alert.alert('chat ended', 'this chat is closed. it cannot be reopened.', [{ text: 'ok' }]);
      return;
    }
    const endAction = {
      text: 'End chat',
      style: 'destructive' as const,
      onPress: () =>
        Alert.alert('End this chat?', 'No new messages after this. It cannot be reopened.', [
          { text: 'Never mind' },
          {
            text: 'End',
            style: 'destructive' as const,
            onPress: () => {
              haptic('light');
              endChat(thread.id);
            },
          },
        ]),
    };

    // Once the window is open with no expiry, there is nothing left to
    // extend to, and stepping it back DOWN to 24h/7d would be one person
    // quietly shortening a window they had both agreed to keep open. So
    // the only move from here is to end the chat outright.
    if (thread.mode === 'always') {
      Alert.alert('Chat window', 'This chat stays open. You both agreed to keep it.', [
        endAction,
        { text: 'Cancel', style: 'cancel' as const },
      ]);
      return;
    }

    Alert.alert(
      'Chat window',
      `Currently ${countdownLabel(thread.mode, thread.expiresAt)}. A longer window takes you both: you ask, they agree. A shorter one takes effect now.`,
      [
        { text: 'Set to 24 hours', onPress: () => void extendChat(thread.id, 'day') },
        { text: 'Ask for 7 days', onPress: () => void extendChat(thread.id, 'week') },
        { text: 'Ask to keep it open', onPress: () => void extendChat(thread.id, 'always') },
        endAction,
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
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
            {/* minWidth 0 is what actually lets these truncate: without
                it a flex child refuses to shrink below its content, so
                a long cast title ran on underneath the expiry pill. */}
            <View style={styles.whoCopy}>
              <Text style={styles.name} numberOfLines={1}>
                {thread.withName}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {thread.planCount > 1 ? `${thread.planCount} plans together` : thread.castTitle}
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="chat window options"
            hitSlop={10}
            onPress={openExpiryMenu}
            style={styles.expiryTap}
          >
            {/* The window is the whole point of the chat, so it has to be
                seen — but an accent-outlined, filled capsule read as an
                alert about something wrong. It is a fact, not a warning:
                plain type at full strength, with the dots that say it
                opens a menu, and the same tap target as before. */}
            <View style={styles.expiryPill}>
              <Text style={styles.expiryLabel}>{expiryText}</Text>
              <View style={styles.expiryDots}>
                <View style={styles.expiryDot} />
                <View style={styles.expiryDot} />
                <View style={styles.expiryDot} />
              </View>
            </View>
          </Pressable>
        </View>

        {/* The list, composer, day separators, grouping, reply, reactions,
            long-press menu, scroll-to-bottom and keyboard handling all belong
            to the chat library now. What stays above it on this screen is what
            the library knows nothing about: the header, the expiry countdown
            and the extension request. */}
        <MessageList
          conversationId={thread.id}
          messages={thread.messages as Message[]}
          meta={messageMeta}
          otherName={thread.withName}
          isEnded={thread.mode === 'ended'}
          hasOlderMessages={thread.hasOlderMessages}
          isLoadingOlder={loadingOlder}
          onSend={(text, replyToId) => void sendWithReply(text, replyToId)}
          onRetry={(messageId) => retryMessage(thread.id, messageId)}
          onLoadEarlier={() => void loadEarlier()}
          onToggleReaction={(messageId, emoji) => void react(messageId, emoji)}
          onOpenMedia={(message) => openMedia(message)}
          onAttach={toggleAttachTray}
        />

        {thread.pending ? (
          <WindowRequest
            mode={thread.pending.mode}
            mine={thread.pending.mine}
            withName={thread.withName}
            onAnswer={(accept) => {
              haptic('light');
              void answerWindowRequest(thread!.id, accept);
            }}
          />
        ) : null}

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
          <>
            {sendError ? <Text style={styles.sendError}>{sendError}</Text> : null}
            {attachOpen ? <AttachTray onChoose={chooseAttachment} /> : null}
          </>
        )}
    </View>
  );
}

function WindowRequest({
  mode,
  mine,
  withName,
  onAnswer,
}: {
  mode: 'week' | 'always';
  mine: boolean;
  withName: string;
  onAnswer: (accept: boolean) => void;
}) {
  const what = mode === 'always' ? 'no expiry' : '7 days';

  return (
    <View style={styles.request} accessibilityLabel="chat notice">
      {/* the same voice as every other line in the app: lowercase, and
          saying what is true rather than announcing itself. */}
      <Text style={styles.requestBody}>
        {mine
          ? `you asked for ${what}. a longer window takes you both, so it waits on ${withName}.`
          : `${withName} asked for ${what}. a longer window is more time you are both reachable, and it takes you both.`}
      </Text>
      <View style={styles.requestActions}>
        {mine ? (
          <Pressable accessibilityRole="button" accessibilityLabel="take it back" onPress={() => onAnswer(false)}>
            <Text style={styles.requestNo}>take it back</Text>
          </Pressable>
        ) : (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel="not now" onPress={() => onAnswer(false)}>
              <Text style={styles.requestNo}>not now</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="agree" onPress={() => onAnswer(true)}>
              <Text style={styles.requestYes}>agree</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

/**
 * The attachment tray: three tiles, between the thread and the composer.
 *
 * SF Symbols on iOS, a mono glyph everywhere else — no emoji. The emoji
 * row that used to sit here was removed for a reason, and putting 📷
 * back in a circle would have walked it straight back in.
 */
function AttachTray({ onChoose }: { onChoose: (kind: 'camera' | 'library' | 'location') => void }) {
  const [rise] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [rise]);

  return (
    <Animated.View
      style={[
        styles.tray,
        {
          opacity: rise,
          transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      <AttachTile label="camera" symbol="camera.fill" glyph="◉" onPress={() => onChoose('camera')} />
      <AttachTile label="photo or GIF" symbol="photo.on.rectangle" glyph="▣" onPress={() => onChoose('library')} />
      <AttachTile label="location" symbol="location.fill" glyph="◈" onPress={() => onChoose('location')} />
    </Animated.View>
  );
}

function AttachTile({
  label,
  symbol,
  glyph,
  onPress,
}: {
  label: string;
  symbol: SFSymbol;
  glyph: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.tile}>
      <View style={styles.tileDisc}>
        {Platform.OS === 'ios' ? (
          <SymbolView name={symbol} size={24} tintColor={tokens.semantic.color.cream} resizeMode="scaleAspectFit" />
        ) : (
          <Text style={styles.tileGlyph}>{glyph}</Text>
        )}
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

/**
 * A photo or GIF inside a bubble.
 *
 * The bucket is private, so the URL is signed and short-lived and
 * arrives a moment after the row does — until it lands, this holds the
 * picture's own aspect ratio rather than collapsing and pushing the
 * thread around when it appears.
 *
 * expo-image plays an animated GIF; React Native's own Image does not
 * on every platform, which is the whole reason a GIF is stored as one.
 */
function isGif(uri: string, mimeType?: string | null): boolean {
  if (mimeType) return mimeType.toLowerCase() === 'image/gif';
  return /\.gif($|\?)/i.test(uri);
}

const styles = StyleSheet.create({
  sendError: { ...tokens.typography.metaSmall, color: tokens.semantic.color.accent, paddingHorizontal: 4, paddingBottom: 6 },
  plusBtn: {
    width: 38,
    height: 38,
    borderRadius: tokens.primitive.radius.pill,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: { fontFamily: fontFamily.text, fontSize: 24, lineHeight: 26, color: tokens.semantic.color.ink },
  // the same capsule as a plain notice: this is a note in the thread
  // that happens to need an answer, not a banner about a problem.
  request: {
    alignSelf: 'center',
    maxWidth: '86%',
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderRadius: tokens.primitive.radius.sheet,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
  },
  requestBody: {
    ...tokens.typography.metaSmall,
    color: tokens.semantic.color.textMutedOnCream,
    lineHeight: 18,
    textAlign: 'center',
  },
  // the actions are the one thing in the capsule at full strength, so
  // the note stays a note and the answer stays findable.
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    minHeight: tokens.component.minTarget,
  },
  requestNo: { fontFamily: fontFamily.displaySemi, fontSize: 14, color: tokens.semantic.color.textMutedOnCream },
  requestYes: { fontFamily: fontFamily.displaySemi, fontSize: 14, color: tokens.semantic.color.accent },
  plusBtnOn: { backgroundColor: tokens.semantic.color.ink, borderColor: tokens.semantic.color.ink },
  plusTextOn: { color: tokens.semantic.color.cream },
  tray: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 18,
    marginBottom: 8,
    borderRadius: tokens.primitive.radius.control,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
  },
  tile: { alignItems: 'center', gap: 8, minWidth: 84 },
  tileDisc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.semantic.color.accent,
  },
  tileGlyph: { fontFamily: fontFamily.monoSemi, fontSize: 22, color: tokens.semantic.color.cream },
  tileLabel: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  bubbleMedia: { padding: 4, overflow: 'hidden' },
  media: {
    width: 220,
    maxWidth: '100%',
    borderRadius: tokens.primitive.radius.chip,
    overflow: 'hidden',
    backgroundColor: tokens.semantic.color.backgroundSubtle,
  },
  mediaImage: { width: '100%', height: '100%' },
  mediaPending: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  caption: { ...tokens.typography.meta, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
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
  backTap: { width: 30, minHeight: 44, justifyContent: 'center' },
  chevron: { fontFamily: fontFamily.text, fontSize: 30, lineHeight: 32, color: tokens.semantic.color.ink },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  whoCopy: { flex: 1, minWidth: 0 },
  name: { fontFamily: fontFamily.displaySemi, fontSize: 16, color: tokens.semantic.color.ink },
  sub: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream },
  thread: { paddingVertical: 16, gap: 10 },
  matchedNote: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, textAlign: 'center', marginBottom: 8 },
  olderBtn: {
    alignSelf: 'center',
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 10,
    borderRadius: tokens.primitive.radius.pill,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
    justifyContent: 'center',
  },
  olderBtnDim: { opacity: 0.7 },
  olderText: { ...tokens.typography.metaSmall, color: tokens.semantic.color.ink },
  // One notice style for the whole thread, plain or with actions: a
  // centred capsule in the ground's own tint, no border, small muted
  // type. A bordered, semibold block in the middle of a conversation
  // read as an error about the chat rather than a note within it.
  systemRow: {
    alignSelf: 'center',
    maxWidth: '86%',
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginVertical: 4,
    borderRadius: tokens.primitive.radius.pill,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
  },
  systemText: {
    ...tokens.typography.metaSmall,
    color: tokens.semantic.color.textMutedOnCream,
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
    justifyContent: 'center',
    // never squeezed by the name beside it, and never squeezing it
    flexShrink: 0,
  },
  expiryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 5,
  },
  expiryLabel: {
    ...tokens.typography.tagSmall,
    color: tokens.semantic.color.accent,
    // strip the mono line-box padding so the text height equals its cap
    // height; the row then centres label and dots on the same line.
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  // three drawn dots instead of a "⋯" glyph, whose font bearing never
  // sat on the label's centre line. views centre exactly via the row.
  expiryDots: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  expiryDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: tokens.semantic.color.accent,
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
