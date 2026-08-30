import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { sendMediaMessageToThread, type LocalMedia } from '@/features/chat/chat';
import { takePendingMedia } from '@/features/chat/pending-media';

/**
 * Preview what you picked before it sends, the way WhatsApp does it.
 *
 * The picker used to fire a photo straight into the chat with no chance
 * to look, caption, or back out. This holds the selection (up to five),
 * shows it big, takes one caption for the batch, and sends only on
 * confirm. The × leaves without sending — the cancel the native camera
 * flow never offered once you had "used" a photo.
 */
export default function MediaSendScreen() {
  const insets = useSafeAreaInsets();
  // read the handoff exactly once, on mount, so a re-render never loses it
  const [pending] = useState(() => takePendingMedia());
  const [items, setItems] = useState<readonly LocalMedia[]>(pending?.items ?? []);
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);
  const [active, setActive] = useState(0);
  const conversationId = pending?.conversationId;
  const guard = useRef(false);

  function removeAt(index: number) {
    haptic('light');
    setItems((current) => current.filter((_, i) => i !== index));
    setActive((a) => Math.max(0, Math.min(a, items.length - 2)));
  }

  async function send() {
    if (guard.current || !conversationId || items.length === 0) return;
    guard.current = true;
    setSending(true);
    haptic('light');
    try {
      // the caption rides the FIRST image, the rest send bare — one
      // caption for a batch, like every messenger.
      for (let i = 0; i < items.length; i += 1) {
        await sendMediaMessageToThread(conversationId, items[i], i === 0 ? caption.trim() : undefined);
      }
      router.back();
    } catch {
      guard.current = false;
      setSending(false);
    }
  }

  if (!pending || items.length === 0) {
    // nothing to preview (opened stale, or all removed): just leave.
    return (
      <View style={[styles.screen, styles.center]}>
        <Pressable accessibilityRole="button" accessibilityLabel="back" onPress={() => router.back()}>
          <Text style={styles.leave}>nothing to send. back.</Text>
        </Pressable>
      </View>
    );
  }

  const many = items.length > 1;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="cancel" hitSlop={12} onPress={() => router.back()}>
            <Text style={styles.close}>×</Text>
          </Pressable>
          <Text style={styles.count}>{many ? `${items.length} selected` : 'preview'}</Text>
          <View style={{ width: 30 }} />
        </View>

        <View style={styles.stage}>
          <Image source={{ uri: items[active]?.uri }} style={styles.hero} contentFit="contain" />
        </View>

        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {many ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.strip}
              keyboardShouldPersistTaps="handled"
            >
              {items.map((item, i) => (
                <View key={`${item.uri}-${i}`} style={styles.thumbWrap}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`preview ${i + 1}`}
                    onPress={() => setActive(i)}
                    style={[styles.thumb, i === active && styles.thumbActive]}
                  >
                    <Image source={{ uri: item.uri }} style={styles.thumbImg} contentFit="cover" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`remove ${i + 1}`}
                    hitSlop={8}
                    onPress={() => removeAt(i)}
                    style={styles.thumbX}
                  >
                    <Text style={styles.thumbXText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}

          {/* caption + send on one bar, WhatsApp-style: a rounded field
              with the send button as a circle at its end. */}
          <View style={styles.composerRow}>
            <TextInput
              accessibilityLabel="add a caption"
              value={caption}
              onChangeText={setCaption}
              placeholder="add a caption…"
              placeholderTextColor="rgba(244,239,228,0.5)"
              selectionColor={tokens.semantic.color.accent}
              style={styles.caption}
              multiline
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={many ? `send ${items.length}` : 'send'}
              accessibilityState={{ disabled: sending }}
              disabled={sending}
              onPress={send}
              style={[styles.sendBtn, sending && styles.sendBtnDim]}
            >
              {sending ? (
                <ActivityIndicator color={tokens.semantic.color.ink} />
              ) : (
                <Text style={styles.sendGlyph}>↑</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0A08' },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  leave: { fontFamily: fontFamily.text, fontSize: 16, color: tokens.semantic.color.cream },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, minHeight: 40 },
  close: { fontFamily: fontFamily.text, fontSize: 30, lineHeight: 32, color: tokens.semantic.color.cream, width: 30 },
  count: { ...tokens.typography.tagSmall, color: tokens.semantic.color.cream },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingTop: 8 },
  hero: { flex: 1, width: '100%', borderRadius: tokens.primitive.radius.control },
  strip: { gap: 10, paddingVertical: 4, paddingBottom: 12 },
  thumbWrap: { width: 60 },
  thumb: { width: 60, height: 60, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: tokens.semantic.color.accent },
  thumbImg: { width: '100%', height: '100%' },
  thumbX: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.semantic.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbXText: { fontFamily: fontFamily.text, fontSize: 13, lineHeight: 15, color: tokens.semantic.color.cream },
  bottom: { paddingHorizontal: 14, paddingTop: 10 },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  caption: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 23,
    backgroundColor: 'rgba(244,239,228,0.12)',
    paddingHorizontal: 18,
    paddingTop: 13,
    paddingBottom: 13,
    fontFamily: fontFamily.text,
    fontSize: 16,
    color: tokens.semantic.color.cream,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: tokens.semantic.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDim: { opacity: 0.5 },
  sendGlyph: { fontFamily: fontFamily.display, fontSize: 22, lineHeight: 24, color: tokens.semantic.color.ink },
});
