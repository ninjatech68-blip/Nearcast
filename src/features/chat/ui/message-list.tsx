import { Bubble, Chat, type BubbleProps, type MessageImageProps } from '@kesha-antonov/react-native-chat';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { ME, toChatMessages, type NearcastChatMessage } from '@/features/chat/adapter';
import { chatTheme, REACTION_EMOJI } from '@/features/chat/theme';
import type { Message } from '@/features/chat/chat';
import type { MessageMeta } from '@/features/chat/remote-chat';
import { preferredMediaPath, useMediaUrl } from '@/features/chat/use-media-url';

/**
 * The conversation, rendered by the chat library.
 *
 * Everything the library owns lives here — the list, the composer, day
 * separators, grouping, reply, reactions, the long-press menu,
 * scroll-to-bottom and keyboard handling. The screen keeps what sits above it:
 * the header, the expiry countdown and the extension request, none of which
 * the library knows about.
 *
 * Three things it does not model are supplied here rather than lost:
 *
 *   ticks     five receipt states against its three, including a failed
 *             message you can tap to retry.
 *   media     an object path in a private bucket, resolved to a signed URL at
 *             render time. Its `image` field wants a URI.
 *   quotes    the quoted text arrives beside the messages rather than on them,
 *             so it is merged in here.
 */

export type MessageListProps = {
  conversationId: string;
  messages: readonly Message[];
  meta: readonly MessageMeta[];
  otherName: string;
  isEnded: boolean;
  hasOlderMessages: boolean;
  isLoadingOlder: boolean;
  onSend: (text: string, replyToId: string | null) => void;
  onRetry: (messageId: string) => void;
  onLoadEarlier: () => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenMedia: (message: Message) => void;
  onAttach: () => void;
};

export function MessageList({
  messages,
  meta,
  otherName,
  isEnded,
  hasOlderMessages,
  isLoadingOlder,
  onSend,
  onRetry,
  onLoadEarlier,
  onToggleReaction,
  onOpenMedia,
  onAttach,
}: MessageListProps) {
  const [replyTo, setReplyTo] = useState<NearcastChatMessage | null>(null);

  const byId = useMemo(() => {
    const map = new Map<string, MessageMeta>();
    for (const entry of meta) map.set(entry.messageId, entry);
    return map;
  }, [meta]);

  // Reply text and reactions arrive from a separate call, keyed by id, so they
  // are merged onto the messages the library renders.
  const chatMessages = useMemo(() => {
    return toChatMessages(messages, otherName).map((message) => {
      const extra = byId.get(String(message._id));
      if (!extra) return message;

      return {
        ...message,
        ...(extra.reactions.length > 0 ? { reactions: extra.reactions } : {}),
        ...(extra.replyToId && extra.replyBody !== null
          ? {
              replyMessage: {
                _id: extra.replyToId,
                text: extra.replyBody,
                user: { _id: extra.replyIsMine ? ME : 'them' },
              },
            }
          : {}),
      };
    });
  }, [messages, otherName, byId]);

  const send = useCallback(
    (outgoing: NearcastChatMessage[]) => {
      const text = outgoing[0]?.text?.trim();
      if (!text) return;

      haptic('selection');
      onSend(text, replyTo ? String(replyTo._id) : null);
      setReplyTo(null);
    },
    [onSend, replyTo],
  );

  const renderBubble = useCallback(
    (props: BubbleProps<NearcastChatMessage>) => (
      <Bubble {...props} renderTicks={(message) => <Ticks message={message} onRetry={onRetry} />} />
    ),
    [onRetry],
  );

  const renderMessageImage = useCallback(
    (props: MessageImageProps<NearcastChatMessage>) => (
      <PrivateMedia message={props.currentMessage} onOpen={onOpenMedia} messages={messages} />
    ),
    [onOpenMedia, messages],
  );

  const actionsFor = useCallback(
    (message: NearcastChatMessage) => {
      const items = [
        {
          label: 'reply',
          onPress: () => {
            haptic('selection');
            setReplyTo(message);
          },
        },
      ];

      if (message.text.trim().length > 0) {
        items.push({
          label: 'copy',
          onPress: () => void Clipboard.setStringAsync(message.text),
        });
      }

      if (message.status === 'failed') {
        items.push({ label: 'try again', onPress: () => onRetry(String(message._id)) });
      }

      return items;
    },
    [onRetry],
  );

  return (
    <Chat<NearcastChatMessage>
      messages={chatMessages}
      user={{ _id: ME }}
      theme={chatTheme}
      onSend={send}
      renderBubble={renderBubble}
      renderMessageImage={renderMessageImage}
      messageActions={actionsFor}
      reactions={{
        isEnabled: !isEnded,
        emojis: REACTION_EMOJI,
        // Called both when an emoji is picked and when an existing pill is
        // tapped; the library leaves toggling to us, which is what the server
        // function already does in one round trip.
        onReactionPress: (message, emoji) => {
          haptic('selection');
          onToggleReaction(String(message._id), emoji);
        },
      }}
      reply={{
        message: replyTo
          ? { _id: replyTo._id, text: replyTo.text, user: replyTo.user }
          : null,
        onClear: () => setReplyTo(null),
        swipe: {
          isEnabled: !isEnded,
          direction: 'left',
          onSwipe: (message) => {
            haptic('selection');
            setReplyTo(message);
          },
        },
      }}
      loadEarlierMessagesProps={{
        isAvailable: hasOlderMessages,
        isLoading: isLoadingOlder,
        onPress: onLoadEarlier,
      }}
      isScrollToBottomEnabled
      isUserAvatarVisible={false}
      isMultiline
      // A closed room is read-only. Hiding the toolbar rather than disabling it
      // says so without a control that looks pressable and is not.
      renderInputToolbar={isEnded ? null : undefined}
      onPressActionButton={onAttach}
      // Our own attachment button rather than the library's, so the label that
      // says what it opens survives — "+" alone does not tell anyone that
      // photos, GIFs and a location are behind it, and a screen reader gets
      // nothing from a plus sign.
      renderActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="send a photo, GIF or your location"
          hitSlop={8}
          onPress={onAttach}
          style={styles.attachButton}
        >
          <Text style={styles.attachText}>+</Text>
        </Pressable>
      )}
      textInputProps={{ placeholder: 'message', accessibilityLabel: 'message' }}
      // An inverted list puts its header at the top of the scroll, which is
      // where the earlier messages are. The note explaining why they are
      // visible at all belongs there, and it was on the old list's header.
      listProps={{
        ListHeaderComponent: hasOlderMessages ? undefined : (
          <Text style={styles.contextNote}>
            you matched. earlier messages are here for context.
          </Text>
        ),
      }}
    />
  );
}

/**
 * Five states, drawn.
 *
 * The library models three, so this replaces its ticks entirely rather than
 * trying to shade them. `failed` is the one that matters: it must never look
 * like a message that went, which is why it says so in words and offers the
 * retry rather than showing a tick at all.
 */
export function Ticks({
  message,
  onRetry,
}: {
  message: NearcastChatMessage;
  onRetry: (messageId: string) => void;
}) {
  if (message.system) return null;

  switch (message.status) {
    case 'pending':
      return <Text style={styles.tick}>·</Text>;
    case 'sent':
      return <Text style={styles.tick}>✓</Text>;
    case 'delivered':
      return <Text style={styles.tick}>✓✓</Text>;
    case 'read':
      return <Text style={[styles.tick, styles.tickRead]}>✓✓</Text>;
    case 'failed':
      return (
        <Text
          accessibilityRole="button"
          accessibilityLabel="message failed, tap to try again"
          onPress={() => onRetry(String(message._id))}
          style={[styles.tick, styles.tickFailed]}
        >
          not sent · retry
        </Text>
      );
    default:
      return null;
  }
}

/**
 * A photo from the private bucket.
 *
 * The path is not a URL, so the library's image renderer cannot load it. This
 * resolves a short-lived signed one, preferring a thumbnail at list size, and
 * shows a placeholder rather than a broken frame while that happens.
 */
function PrivateMedia({
  message,
  onOpen,
  messages,
}: {
  message: NearcastChatMessage;
  onOpen: (message: Message) => void;
  messages: readonly Message[];
}) {
  // A thumbnail at list size rather than the original: a coordination room is
  // scrolled on a phone, and signing the full photo for a 220pt frame wastes
  // the bandwidth and the signature.
  const variant = LIST_VARIANT;
  const path = preferredMediaPath(message.mediaPath, message.mediaThumbPath, variant);
  const url = useMediaUrl(path, variant);
  const original = messages.find((entry) => entry.id === String(message._id));

  if (!url) {
    return (
      <View style={styles.mediaPlaceholder}>
        <ActivityIndicator color={tokens.semantic.color.textMutedOnCream} />
      </View>
    );
  }

  return (
    <Image
      accessibilityRole="imagebutton"
      accessibilityLabel="photo in this chat"
      contentFit="cover"
      onTouchEnd={() => original && onOpen(original)}
      source={{ uri: url }}
      style={styles.media}
    />
  );
}

const LIST_VARIANT = { kind: 'image', width: 440, height: 440 } as const;

const styles = StyleSheet.create({
  tick: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: tokens.primitive.color.cream45,
    marginLeft: 4,
  },
  tickRead: { color: tokens.semantic.color.accent },
  tickFailed: { color: tokens.semantic.color.accent, fontFamily: fontFamily.monoSemi },
  attachButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  attachText: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    lineHeight: 26,
    color: tokens.semantic.color.textMutedOnCream,
  },
  contextNote: {
    ...tokens.typography.metaSmall,
    textAlign: 'center',
    color: tokens.semantic.color.textMutedOnCream,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  media: { width: 220, height: 220, borderRadius: tokens.primitive.radius.chip },
  mediaPlaceholder: {
    width: 220,
    height: 220,
    borderRadius: tokens.primitive.radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.semantic.color.backgroundSubtle,
  },
});
