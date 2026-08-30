import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/design-system/tokens';
import type {
  RoomMessageRecord,
  RoomParticipant,
} from '@/features/messages/domain/message';
import type { RoomLifetime } from '@/features/messages/domain/room';
import {
  fetchMessagePage,
  fetchRoom,
  sendMessage,
  subscribeToRoom,
} from '@/features/messages/data/messages-repository';
import { MatchRoom } from '@/features/messages/ui/match-room';
import { supabase } from '@/infrastructure/supabase/client';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      room: RoomLifetime;
      participants: RoomParticipant[];
      hasEarlier: boolean;
    };

/**
 * Client-generated message id, which doubles as the send's idempotency key.
 * The column is a uuid, so the fallback has to produce a well-formed v4 rather
 * than an arbitrary unique string.
 */
function newMessageId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid !== undefined) return uuid;

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    const digit = character === 'x' ? value : (value % 4) + 8;

    return digit.toString(16);
  });
}

export default function MatchRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [messages, setMessages] = useState<RoomMessageRecord[]>([]);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    async function load() {
      setState({ status: 'loading' });

      try {
        const { data } = await supabase.auth.getUser();
        const snapshot = await fetchRoom(id);
        if (!isMounted.current) return;

        setViewerId(data.user?.id ?? null);
        setMessages(snapshot.messages);
        setState({
          status: 'ready',
          room: snapshot.room,
          participants: snapshot.participants,
          hasEarlier: snapshot.hasEarlier,
        });
      } catch {
        if (!isMounted.current) return;
        setState({
          status: 'error',
          message: 'This room could not be opened. Check your connection and try again.',
        });
      }
    }

    void load();
  }, [id]);

  useEffect(() => {
    if (state.status !== 'ready') return;

    const channel = subscribeToRoom(id, (incoming) => {
      setMessages((current) =>
        current.some((message) => message.id === incoming.id)
          ? current
          : [...current, incoming],
      );
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, state.status]);

  const handleSend = useCallback(
    (body: string, replyToId: string | null) => {
      if (viewerId === null) return;

      const messageId = newMessageId();
      const optimistic: RoomMessageRecord = {
        id: messageId,
        senderId: viewerId,
        body,
        isSystem: false,
        createdAt: new Date(),
        replyToId,
        delivery: 'pending',
      };

      setMessages((current) => [...current, optimistic]);

      void sendMessage({
        conversationId: id,
        messageId,
        senderId: viewerId,
        body,
        replyToId,
      })
        .then((persisted) => {
          if (!isMounted.current) return;
          setMessages((current) =>
            current.map((message) =>
              message.id === optimistic.id ? persisted : message,
            ),
          );
        })
        .catch(() => {
          // The message stays queued and visibly pending rather than silently
          // disappearing or claiming a delivery that did not happen.
          if (!isMounted.current) return;
        });
    },
    [id, viewerId],
  );

  const handleLoadEarlier = useCallback(() => {
    if (state.status !== 'ready' || !state.hasEarlier || isLoadingEarlier) return;

    const oldest = messages.reduce<Date | undefined>(
      (earliest, message) =>
        earliest === undefined || message.createdAt < earliest
          ? message.createdAt
          : earliest,
      undefined,
    );

    setIsLoadingEarlier(true);
    void fetchMessagePage(id, oldest)
      .then((page) => {
        if (!isMounted.current) return;
        setMessages((current) => [...page.messages, ...current]);
        setState((current) =>
          current.status === 'ready'
            ? { ...current, hasEarlier: page.hasEarlier }
            : current,
        );
      })
      .finally(() => {
        if (isMounted.current) setIsLoadingEarlier(false);
      });
  }, [id, isLoadingEarlier, messages, state]);

  const participants = useMemo(
    () => (state.status === 'ready' ? state.participants : []),
    [state],
  );

  if (state.status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.semantic.color.actionPrimary} />
        <Text style={styles.hint}>Opening the room</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Room unavailable</Text>
        <Text style={styles.hint}>{state.message}</Text>
      </View>
    );
  }

  if (viewerId === null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Sign in to continue</Text>
        <Text style={styles.hint}>This room is private to the two matched people.</Text>
      </View>
    );
  }

  return (
    <MatchRoom
      viewerId={viewerId}
      participants={participants}
      messages={messages}
      room={state.room}
      onSend={handleSend}
      onLoadEarlier={handleLoadEarlier}
      hasEarlier={state.hasEarlier}
      isLoadingEarlier={isLoadingEarlier}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    backgroundColor: tokens.semantic.color.backgroundCanvas,
    flex: 1,
    gap: tokens.primitive.space[2],
    justifyContent: 'center',
    paddingHorizontal: tokens.primitive.space[8],
  },
  title: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.bodyStrong.fontSize,
  },
  hint: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.body.fontSize,
    lineHeight: tokens.typography.body.lineHeight,
    textAlign: 'center',
  },
});
