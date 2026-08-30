import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import {
  fetchConversationSummaries,
  type ConversationSummary,
} from '@/features/messages/data/messages-repository';
import { deriveRoomState, describeRoomDeadline } from '@/features/messages/domain/room';
import { Group, ScreenTitle, Section, SymbolIcon } from '@/features/native-demo/native-ui';
import { supabase } from '@/infrastructure/supabase/client';

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'signed_out' }
  | { status: 'ready'; rooms: ConversationSummary[] };

export default function MessagesScreen() {
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);
  const now = new Date();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;

        const viewerId = data.user?.id;
        if (viewerId === undefined) {
          setState({ status: 'signed_out' });
          return;
        }

        const rooms = await fetchConversationSummaries(viewerId);
        if (cancelled) return;

        setState({ status: 'ready', rooms });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setReloadToken((token) => token + 1);
  }, []);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle>Messages</ScreenTitle>

        {state.status === 'loading' && (
          <View style={styles.centered}>
            <ActivityIndicator color={tokens.semantic.color.actionPrimary} />
          </View>
        )}

        {state.status === 'error' && (
          <Section title="Rooms unavailable">
            <Group>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Try loading your rooms again"
                onPress={retry}>
                <View style={styles.emptyRow}>
                  <View style={styles.emptyIcon}>
                    <SymbolIcon fallback="!" name="exclamationmark" />
                  </View>
                  <View style={styles.roomCopy}>
                    <Text style={styles.title}>We could not load your rooms</Text>
                    <Text style={styles.body}>Check your connection, then tap to try again.</Text>
                  </View>
                </View>
              </Pressable>
            </Group>
          </Section>
        )}

        {state.status === 'signed_out' && (
          <Section title="Start a conversation">
            <Group>
              <View style={styles.emptyRow}>
                <View style={styles.emptyIcon}><SymbolIcon fallback="M" name="message" /></View>
                <View style={styles.roomCopy}>
                  <Text style={styles.title}>Sign in to see your rooms</Text>
                  <Text style={styles.body}>Rooms are private to the two people in a match.</Text>
                </View>
              </View>
            </Group>
          </Section>
        )}

        {state.status === 'ready' && state.rooms.length === 0 && (
          <Section title="Start a conversation">
            <Group>
              <View style={styles.emptyRow}>
                <View style={styles.emptyIcon}><SymbolIcon fallback="M" name="message" /></View>
                <View style={styles.roomCopy}>
                  <Text style={styles.title}>Messages appear after acceptance</Text>
                  <Text style={styles.body}>
                    Once there is mutual interest, you can coordinate here.
                  </Text>
                </View>
              </View>
            </Group>
          </Section>
        )}

        {state.status === 'ready' && state.rooms.length > 0 && (
          <Section title="Active rooms">
            <Group>
              {state.rooms.map((room) => {
                const isClosed = deriveRoomState(room.room, now) === 'closed';

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${room.intentStatement}, with ${room.counterpartName}`}
                    key={room.conversationId}
                    onPress={() => router.push(`/room/${room.conversationId}`)}>
                    <View style={styles.roomRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initialsOf(room.counterpartName)}</Text>
                      </View>
                      <View style={styles.roomCopy}>
                        <Text style={styles.title}>{room.intentStatement}</Text>
                        <Text style={styles.body}>{room.counterpartName}</Text>
                        <Text style={[styles.status, isClosed && styles.statusClosed]}>
                          {describeRoomDeadline(room.room, now)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </Group>
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  centered: { paddingVertical: 32 },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.semantic.color.trustSurface },
  avatarText: { fontFamily: 'Manrope_700Bold', fontSize: 18, color: tokens.semantic.color.trustText },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.semantic.color.backgroundSubtle },
  roomCopy: { flex: 1 },
  title: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  body: { marginTop: 2, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.textSecondary },
  status: { marginTop: 4, fontFamily: 'Manrope_600SemiBold', fontSize: 12, lineHeight: 17, color: tokens.semantic.color.trustText },
  statusClosed: { color: tokens.semantic.color.textMuted },
});
