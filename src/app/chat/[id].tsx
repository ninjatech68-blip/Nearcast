import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
  Animated,
  Keyboard,
  Linking,
  RefreshControl,
} from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { Face } from '@/design-system/components/face';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos, isVerified } from '@/features/casts/faces';
import {
  answerWindowRequest,
  chatEnabled,
  endChat,
  extendChat,
  openConversation,
  refreshConversationMessages,
  retryMessage,
  sendLocationMessage,
  sendMediaMessageToThread,
  sendMessage,
  useThread,
  type LocalMedia,
  type Message,
} from '@/features/chat/chat';
import { useMediaUrl } from '@/features/chat/use-media-url';
import { countdownLabel, countdownTickMs } from '@/features/chat/countdown';
import { useRefresher } from '@/infrastructure/net/use-refresher';
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
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const connectivity = useConnectivity();
  const netNote = connectivityNote(connectivity);

  // backend mode: load the conversation and subscribe to new messages.
  // no-op on fixtures, where the seed thread is already in the cache.
  useEffect(() => {
    if (!id) return;
    return openConversation(id);
  }, [id]);

  const { refreshing, onRefresh } = useRefresher(async () => {
    if (id) await refreshConversationMessages(id);
  });

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
    setAttachOpen(false);
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
      void shareLocation();
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
      // is a still frame. quality < 1 for the same reason it exists —
      // a 12MP camera photo is not worth the upload on mobile data —
      // but it does not apply to a GIF, which is copied as picked.
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.75, exif: false })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.75,
              exif: false,
              // ask iOS for the asset AS STORED. transcoding a GIF to a
              // "compatible" representation flattens it to one frame,
              // which would make sending a GIF pointless.
              preferredAssetRepresentationMode:
                ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
            });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      const media: LocalMedia = {
        uri: asset.uri,
        kind: isGif(asset.uri, asset.mimeType) ? 'gif' : 'image',
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
      };
      setSending(true);
      await sendMediaMessageToThread(thread!.id, media);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {
      haptic('warning');
      setSendError("that didn't send. try again.");
    } finally {
      setSending(false);
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
            {/* minWidth 0 is what actually lets these truncate: without
                it a flex child refuses to shrink below its content, so
                a long cast title ran on underneath the expiry pill. */}
            <View style={styles.whoCopy}>
              <Text style={styles.name} numberOfLines={1}>
                {thread.withName}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {thread.castTitle}
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
            {/* the window is the whole point of the chat — a muted 11pt
                label in the corner was missed by every tester. it reads
                as an accent pill now, at the same tap target. */}
            <View style={styles.expiryPill}>
              <Text style={styles.expiryLabel}>{expiryText}</Text>
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
          refreshControl={
            // realtime delivers new messages, but a thread that missed a
            // wake should not need closing and reopening to catch up.
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={tokens.semantic.color.accent}
            />
          }
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
          <View style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
            {sendError ? <Text style={styles.sendError}>{sendError}</Text> : null}
            {attachOpen ? <AttachTray onChoose={chooseAttachment} /> : null}
            <View style={styles.composer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="send a photo, GIF or your location"
                accessibilityState={{ disabled: sending, expanded: attachOpen }}
                disabled={sending}
                onPress={toggleAttachTray}
                hitSlop={8}
                style={[styles.plusBtn, attachOpen && styles.plusBtnOn, sending && styles.sendDim]}
              >
                {sending ? (
                  <ActivityIndicator color={tokens.semantic.color.ink} />
                ) : (
                  <Text style={[styles.plusText, attachOpen && styles.plusTextOn]}>
                    {attachOpen ? '×' : '+'}
                  </Text>
                )}
              </Pressable>
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
  const hasMedia = message.mediaPath !== undefined;
  const body = (
    <>
      <View
        style={[
          styles.bubble,
          mine ? styles.mine : styles.theirs,
          failed && styles.bubbleFailed,
          hasMedia && styles.bubbleMedia,
        ]}
      >
        {hasMedia ? (
          <>
            <MediaBubble message={message} />
            {message.text ? (
              <Text style={[styles.caption, mine ? styles.mineText : styles.theirsText]}>{message.text}</Text>
            ) : null}
          </>
        ) : hasLocation ? (
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

/**
 * An open request to make the chat window longer.
 *
 * Both sides see it, because both sides carry the consequence. The
 * person who asked sees that they are waiting and can take it back; the
 * other sees what was asked and answers it. Nothing about the window
 * changes until they do.
 */
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
    <View style={styles.request}>
      <Text style={styles.requestTitle}>
        {mine ? `You asked for ${what}` : `${withName} asked for ${what}`}
      </Text>
      <Text style={styles.requestBody}>
        {mine
          ? `A longer window takes you both. Waiting on ${withName}.`
          : 'A longer window is more time you are both reachable. It takes you both.'}
      </Text>
      {mine ? (
        <View style={styles.requestActions}>
          <QuietAction label="Take it back" color={tokens.semantic.color.ink} onPress={() => onAnswer(false)} />
        </View>
      ) : (
        <View style={styles.requestActions}>
          <QuietAction label="Not now" color={tokens.semantic.color.ink} onPress={() => onAnswer(false)} />
          <View style={styles.requestAgree}>
            <BarButton label="Agree" variant="onOrange" onPress={() => onAnswer(true)} />
          </View>
        </View>
      )}
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
function MediaBubble({ message }: { message: Message }) {
  const url = useMediaUrl(message.mediaPath);
  const ratio =
    message.mediaWidth && message.mediaHeight ? message.mediaWidth / message.mediaHeight : 1;

  return (
    <View style={[styles.media, { aspectRatio: ratio }]}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={styles.mediaImage}
          contentFit="cover"
          transition={120}
          accessibilityLabel={message.mediaKind === 'gif' ? 'a GIF' : 'a photo'}
        />
      ) : (
        <View style={styles.mediaPending}>
          <ActivityIndicator color={tokens.semantic.color.accent} />
        </View>
      )}
    </View>
  );
}

/** a GIF must not be re-encoded, so it has to be recognised as one. */
function isGif(uri: string, mimeType?: string | null): boolean {
  if (mimeType) return mimeType.toLowerCase() === 'image/gif';
  return /\.gif($|\?)/i.test(uri);
}

function tickFor(status: NonNullable<Message['status']>): string {
  return { pending: '…', sent: '✓', delivered: '✓✓', read: '✓✓', failed: '!' }[status];
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
  request: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: tokens.primitive.radius.control,
    borderWidth: 1,
    borderColor: tokens.semantic.color.accent,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
  },
  requestTitle: { fontFamily: fontFamily.displaySemi, fontSize: 15, color: tokens.semantic.color.ink },
  requestBody: {
    ...tokens.typography.metaSmall,
    color: tokens.semantic.color.textMutedOnCream,
    lineHeight: 18,
    marginTop: 4,
  },
  requestActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  requestAgree: { flex: 1 },
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
    justifyContent: 'center',
    // never squeezed by the name beside it, and never squeezing it
    flexShrink: 0,
  },
  expiryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
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
    fontSize: 14,
    lineHeight: 14,
    color: tokens.semantic.color.accent,
    // the ⋯ glyph carries bottom bearing that dropped it below the
    // label's centre line; this lifts it back onto it. the row centres
    // both, so this is the last few px of optical alignment.
    marginBottom: 2,
    includeFontPadding: false,
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
