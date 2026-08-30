import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { Stamp } from '@/design-system/components/stamp';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { casters } from '@/features/casts/fixtures';
import { usePersonFirstName } from '@/features/me/remote-profile';
import { blockCaster } from '@/features/me/me-store';

const REASONS = [
  { id: 'harass', label: 'harassing me' },
  { id: 'fake', label: 'faked being someone else' },
  { id: 'unsafe', label: 'made me feel unsafe in person' },
  { id: 'noshow', label: 'flaked repeatedly' },
  { id: 'ad', label: 'selling something / spam' },
  { id: 'other', label: 'something else' },
] as const;

type Sent = 'idle' | 'sending' | 'sent';

/**
 * report sheet. every report is looked at by a human; nothing is
 * auto-actioned. the person reported never learns who reported them.
 * the block toggle is on by default because a report without a block
 * usually leaves the reporter open to the same person.
 */
export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const person = casters.find((c) => c.id === id);
  const liveName = usePersonFirstName(id);
  const name = liveName ?? person?.name ?? 'them';

  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [state, setState] = useState<Sent>('idle');

  const ready = reason !== null;

  function submit() {
    setState('sending');
    setTimeout(() => {
      // fixture: no server, just haptic + block + return
      if (alsoBlock && id) blockCaster(id);
      haptic('success');
      setState('sent');
      setTimeout(() => router.back(), 900);
    }, 500);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <SheetShell title={`report ${name}`}>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.flex}>
          <Text style={styles.hint}>a human reads every report. {name} is never told it was you.</Text>

          <Text style={styles.section}>WHAT HAPPENED?</Text>
          <View style={styles.chips}>
            {REASONS.map((r) => {
              const on = reason === r.id;
              return (
                <Pressable
                  key={r.id}
                  accessibilityRole="radio"
                  accessibilityLabel={r.label}
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    haptic('selection');
                    setReason(r.id);
                  }}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.section}>ANYTHING ELSE?</Text>
          <TextInput
            accessibilityLabel="report note"
            value={note}
            onChangeText={setNote}
            placeholder="one or two lines. more if you need."
            placeholderTextColor={tokens.semantic.color.hairlineOnCream}
            selectionColor={tokens.semantic.color.accent}
            style={styles.input}
            multiline
          />

          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="also block them"
            accessibilityState={{ checked: alsoBlock }}
            onPress={() => setAlsoBlock((v) => !v)}
            style={styles.blockRow}
          >
            <View style={[styles.box, alsoBlock && styles.boxOn]}>{alsoBlock ? <Text style={styles.check}>✓</Text> : null}</View>
            <Text style={styles.blockText}>also block {name} · recommended</Text>
          </Pressable>

          <SheetNote>
            reports run through a small human team. anything urgent (in-person harm, threats) goes to the top of the queue.
          </SheetNote>
        </ScrollView>

        <View style={styles.actions}>
          {state === 'sent' ? (
            <View style={styles.sentRow}>
              <Stamp label="SENT" color={tokens.semantic.color.accent} withHaptic={false} />
              <Text style={styles.sentLine}>thanks. we look at every one.</Text>
            </View>
          ) : (
            <>
              <BarButton
                label="send report"
                variant="onOrange"
                onPress={submit}
                disabled={!ready}
                loading={state === 'sending'}
              />
              <QuietAction label="never mind" color={tokens.semantic.color.ink} onPress={() => router.back()} />
            </>
          )}
        </View>
      </SheetShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hint: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 4 },
  section: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 22, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: tokens.primitive.radius.pill,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: tokens.semantic.color.ink, borderColor: tokens.semantic.color.ink },
  chipText: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  chipTextOn: { color: tokens.semantic.color.cream },
  input: {
    minHeight: 96,
    borderRadius: tokens.primitive.radius.control,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    padding: 14,
    fontFamily: fontFamily.text,
    fontSize: 15,
    lineHeight: 22,
    color: tokens.semantic.color.ink,
    textAlignVertical: 'top',
  },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: tokens.semantic.color.hairlineOnCream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: tokens.semantic.color.ink, borderColor: tokens.semantic.color.ink },
  check: { color: tokens.semantic.color.cream, fontFamily: fontFamily.text, fontSize: 14, lineHeight: 14 },
  blockText: { fontFamily: fontFamily.displaySemi, fontSize: 15, color: tokens.semantic.color.ink, flex: 1 },
  actions: { marginTop: 18, gap: 2 },
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 58 },
  sentLine: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, flex: 1 },
});
