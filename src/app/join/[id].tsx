import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { Field } from '@/design-system/components/field';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { Stamp } from '@/design-system/components/stamp';
import { haptic } from '@/design-system/haptics';
import { tokens } from '@/design-system/tokens';
import { getCast, submitJoin } from '@/features/casts/store';
import { submit } from '@/infrastructure/net/submit';

type SendState = 'idle' | 'sending' | 'sent';

/**
 * the note sheet. the primary bar stays dead at zero characters,
 * so an empty note needs no error banner.
 */
export default function JoinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cast = getCast(id ?? '');
  const name = cast?.by ?? 'them';

  const [note, setNote] = useState('');
  const [state, setState] = useState<SendState>('idle');
  const [error, setError] = useState<string | null>(null);

  /**
   * on failure the note stays in the field and the sheet stays open —
   * a joiner should never have to rewrite what they said because the
   * network dropped.
   */
  async function send() {
    setState('sending');
    setError(null);
    const result = await submit(() => {
      if (cast) submitJoin(cast.id, note);
    });
    if (!result.ok) {
      haptic('warning');
      setState('idle');
      setError(
        result.reason === 'offline'
          ? "you're offline. your note is still here — tap when you're back."
          : "that didn't send. your note is still here — tap to try again.",
      );
      return;
    }
    haptic('success');
    setState('sent');
    setTimeout(() => router.back(), 900);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <SheetShell title={`ask ${name}`}>
        <View style={styles.fieldHolder}>
          <Field
            value={note}
            onChange={setNote}
            placeholder="one line. why you're in."
            accessibilityLabel="your note"
            fontSize={26}
            autoFocus={state === 'idle'}
          />
        </View>
        <SheetNote>{`${name} gets your first name + this note. nothing else.`}</SheetNote>
        <SheetNote>{`first time with ${name.toLowerCase()}? somewhere public is smart.`}</SheetNote>
        <View style={styles.actions}>
          {state === 'sent' ? (
            <View style={styles.sentRow}>
              <Stamp label="SENT" color={tokens.semantic.color.accent} withHaptic={false} />
              <Text style={styles.sentLine}>{`${name.toLowerCase()} decides. you'll hear here.`}</Text>
            </View>
          ) : (
            <>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <BarButton
                label={error ? 'try again' : 'send request'}
                variant="onOrange"
                onPress={send}
                loading={state === 'sending'}
                loadingLabel="sending…"
                disabled={note.trim().length === 0}
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
  fieldHolder: { marginTop: 14 },
  actions: { marginTop: 16, gap: 2 },
  error: { ...tokens.typography.metaSmall, color: tokens.semantic.color.accent, marginBottom: 10, textAlign: 'center' },
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 58 },
  sentLine: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, flex: 1 },
});
