import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  Bubble,
  Composer,
  Day,
  GiftedChat,
  InputToolbar,
  SystemMessage,
  Time,
  type BubbleProps,
  type ComposerProps,
  type DayProps,
  type InputToolbarProps,
  type ReplyMessage,
  type SendProps,
  type SystemMessageProps,
  type TimeProps,
} from 'react-native-gifted-chat';

import {
  messageBodySchema,
  toRoomChatMessages,
  type RoomChatMessage,
  type RoomMessageRecord,
  type RoomParticipant,
} from '@/features/messages/domain/message';
import {
  canSendMessage,
  deriveRoomState,
  describeRoomDeadline,
  type RoomLifetime,
} from '@/features/messages/domain/room';
import { bubbleStyles, roomStyles } from '@/features/messages/ui/room-theme';

/**
 * The match room.
 *
 * Gifted Chat supplies the list, keyboard handling, day grouping and reply
 * gesture. Everything the product rules exclude is simply never enabled:
 *
 * - typing and presence: `isTyping` is never passed and the typing indicator is
 *   rendered as null (Plan 04 Task 4, Mobile Screen Contracts line 33)
 * - image, video, audio: the mapper cannot emit those fields, and no `actions`
 *   array is supplied so the attachment sheet has no entry point
 * - live location: no location field and no custom view
 * - quick replies: the room carries peer messages only, so offering canned
 *   replies would put words in a party's mouth
 * - read receipts: `received` is never set, so only the factual pending/sent
 *   tick can render
 */

export type MatchRoomProps = {
  viewerId: string;
  participants: readonly RoomParticipant[];
  messages: readonly RoomMessageRecord[];
  room: RoomLifetime;
  onSend: (body: string, replyToId: string | null) => void;
  onLoadEarlier?: () => void;
  hasEarlier?: boolean;
  isLoadingEarlier?: boolean;
  /** Injectable clock so expiry states are testable. */
  now?: Date;
};

export function MatchRoom({
  viewerId,
  participants,
  messages,
  room,
  onSend,
  onLoadEarlier = () => {},
  hasEarlier = false,
  isLoadingEarlier = false,
  now = new Date(),
}: MatchRoomProps) {
  const [replyTo, setReplyTo] = useState<ReplyMessage | null>(null);

  const roomState = deriveRoomState(room, now);
  const isWritable = canSendMessage(room, now);
  const deadlineLabel = describeRoomDeadline(room, now);

  const chatMessages = useMemo(
    () => toRoomChatMessages(messages, participants),
    [messages, participants],
  );

  const handleSend = useCallback(
    (outgoing: RoomChatMessage[]) => {
      const [next] = outgoing;
      if (next === undefined) return;

      const parsed = messageBodySchema.safeParse(next.text);
      if (!parsed.success) return;

      onSend(parsed.data, replyTo === null ? null : String(replyTo._id));
      setReplyTo(null);
    },
    [onSend, replyTo],
  );

  const renderBubble = useCallback(
    (props: BubbleProps<RoomChatMessage>) => (
      <Bubble
        {...props}
        wrapperStyle={bubbleStyles.wrapper}
        textStyle={bubbleStyles.text}
        usernameStyle={bubbleStyles.username}
        tickStyle={bubbleStyles.tick}
        renderTime={renderTime}
      />
    ),
    [],
  );

  const renderInputToolbar = useCallback(
    (props: InputToolbarProps<RoomChatMessage>) =>
      isWritable ? (
        <InputToolbar
          {...props}
          containerStyle={roomStyles.toolbar}
          primaryStyle={roomStyles.toolbarPrimary}
        />
      ) : (
        <ClosedRoomNotice />
      ),
    [isWritable],
  );

  return (
    <View style={roomStyles.screen}>
      <GiftedChat<RoomChatMessage>
        messages={chatMessages}
        user={{ _id: viewerId }}
        onSend={handleSend}
        // Allowed: history, day grouping, link detection, scroll affordance.
        loadEarlierMessagesProps={{
          isAvailable: hasEarlier,
          isInfiniteScrollEnabled: true,
          isLoading: isLoadingEarlier,
          onPress: onLoadEarlier,
        }}
        isScrollToBottomEnabled
        isUsernameVisible
        // Excluded by Plan 04 Task 4 and Mobile Screen Contracts line 33.
        renderTypingIndicator={renderNothing}
        // Allowed: reply is peer-authored and stored on the message row.
        reply={{
          message: replyTo,
          onClear: () => setReplyTo(null),
          swipe: {
            isEnabled: isWritable,
            onSwipe: (message) =>
              setReplyTo({
                _id: message._id,
                text: message.text,
                user: message.user,
              }),
          },
        }}
        textInputProps={{
          placeholder: 'Write a message',
          maxLength: 2000,
          accessibilityLabel: 'Message',
          editable: isWritable,
        }}
        renderBubble={renderBubble}
        renderDay={renderDay}
        renderSystemMessage={renderSystemMessage}
        renderComposer={renderComposer}
        renderSend={renderSend}
        renderInputToolbar={renderInputToolbar}
        renderChatEmpty={renderEmptyRoom}
        renderChatFooter={() =>
          // A closed room already says so in place of the composer; repeating it
          // here would show the same sentence twice.
          isWritable ? (
            <DeadlineBanner
              label={deadlineLabel}
              isUrgent={roomState === 'closing_soon'}
            />
          ) : null
        }
      />
    </View>
  );
}

const renderNothing = () => null;

function renderTime(props: TimeProps<RoomChatMessage>) {
  return <Time {...props} timeTextStyle={bubbleStyles.time} />;
}

function renderDay(props: DayProps) {
  return (
    <Day
      {...props}
      containerStyle={roomStyles.dayContainer}
      textProps={{ style: roomStyles.dayText }}
    />
  );
}

function renderSystemMessage(props: SystemMessageProps<RoomChatMessage>) {
  return (
    <SystemMessage
      {...props}
      containerStyle={roomStyles.systemContainer}
      textStyle={roomStyles.systemText}
    />
  );
}

function renderComposer(props: ComposerProps) {
  return (
    <Composer
      {...props}
      textInputProps={{ ...props.textInputProps, style: roomStyles.composer }}
    />
  );
}

function renderSend(props: SendProps<RoomChatMessage>) {
  const hasText = messageBodySchema.safeParse(props.text ?? '').success;
  if (!hasText) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Send message"
      style={roomStyles.sendContainer}
      onPress={() => {
        if (props.text !== undefined && props.onSend !== undefined) {
          props.onSend({ text: props.text.trim() }, true);
        }
      }}>
      <View style={roomStyles.sendButton}>
        <Text style={roomStyles.sendLabel}>Send</Text>
      </View>
    </Pressable>
  );
}

function DeadlineBanner({ label, isUrgent }: { label: string; isUrgent: boolean }) {
  return (
    <View
      style={[roomStyles.deadlineBanner, isUrgent && roomStyles.deadlineBannerUrgent]}>
      <Text style={[roomStyles.deadlineText, isUrgent && roomStyles.deadlineTextUrgent]}>
        {label}
      </Text>
    </View>
  );
}

function ClosedRoomNotice() {
  return (
    <View style={roomStyles.closedNotice}>
      <Text style={roomStyles.closedTitle}>This room has closed</Text>
      <Text style={roomStyles.closedBody}>
        You can still read what was agreed here. Start a new intent to coordinate again.
      </Text>
    </View>
  );
}

function renderEmptyRoom() {
  return (
    <View style={roomStyles.emptyContainer}>
      <Text style={roomStyles.emptyTitle}>No messages yet</Text>
      <Text style={roomStyles.emptyBody}>
        This room is open to the two of you. Share only what you need to coordinate.
      </Text>
    </View>
  );
}
