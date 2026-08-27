import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Face } from '@/design-system/components/face';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos } from '@/features/casts/faces';
import { sendMessage, useThread, type Message } from '@/features/chat/chat';

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
  const scrollRef = useRef<ScrollView>(null);

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

  function send() {
    if (!draft.trim()) return;
    haptic('light');
    sendMessage(thread!.id, draft);
    setDraft('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
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
            <Face photo={facePhotos[thread.withId]} initials={thread.withName.slice(0, 2).toUpperCase()} size={32} label="" />
            <View>
              <Text style={styles.name}>{thread.withName}</Text>
              <Text style={styles.sub}>{thread.castTitle}</Text>
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
            <Bubble key={message.id} message={message} />
          ))}
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ message }: { message: Message }) {
  if (message.from === 'system') {
    return (
      <View style={styles.systemRow} accessibilityLabel="meeting spot">
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }
  const mine = message.from === 'me';
  return (
    <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text style={[styles.bubbleText, mine ? styles.mineText : styles.theirsText]}>{message.text}</Text>
      </View>
      <Text style={styles.time}>{message.time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
