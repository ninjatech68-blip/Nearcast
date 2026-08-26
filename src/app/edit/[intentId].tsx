import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { StatePanel, type ScreenState } from '@/design-system/components/state-panel';
import { tokens } from '@/design-system/tokens';
import {
  fetchEditableIntent,
  updateIntent,
  type EditableIntent,
} from '@/features/intents/data/intent-queries';
import type { IntentEdit } from '@/features/intents/domain/intent';

type EditState = { kind: 'content'; intent: EditableIntent } | ScreenState;

/** Rupees on screen, minor units in the database. */
function toMinorUnits(input: string): number | null | 'invalid' {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return 'invalid';
  return Math.round(Number(trimmed) * 100);
}

/**
 * Owner edit. Everything here can change what a respondent already agreed to,
 * so the screen says plainly that existing respondents will be told, and the
 * server records the change (MUST-017).
 */
export default function EditIntentScreen() {
  const { intentId } = useLocalSearchParams<{ intentId: string }>();
  const queryClient = useQueryClient();

  const [statement, setStatement] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['intent-edit', intentId],
    queryFn: () => fetchEditableIntent(intentId ?? ''),
  });

  const state: EditState = query.isPending
    ? { kind: 'loading' }
    : query.isError || !query.data || query.data.state === 'error'
      ? { kind: 'error', message: 'We could not load this intent. Try again.' }
      : query.data.data
        ? { kind: 'content', intent: query.data.data }
        : { kind: 'restricted', message: 'This intent is not available to you.' };

  if (state.kind !== 'content') {
    return (
      <SafeAreaView style={styles.screen}>
        <StatePanel onRetry={() => void query.refetch()} state={state} />
      </SafeAreaView>
    );
  }

  const { intent } = state;

  if (intent.status !== 'draft' && intent.status !== 'live') {
    return (
      <SafeAreaView style={styles.screen}>
        <StatePanel
          state={{
            kind: 'restricted',
            message:
              'This intent can no longer be edited. Coordination has started or it has closed.',
          }}
        />
      </SafeAreaView>
    );
  }

  const currentPrice = intent.priceMinor === null ? '' : (intent.priceMinor / 100).toString();
  const statementValue = statement ?? intent.statement;
  const placeValue = place ?? intent.approximatePlace ?? '';
  const priceValue = price ?? currentPrice;

  async function save() {
    const minorUnits = toMinorUnits(priceValue);
    if (minorUnits === 'invalid') {
      setError('Enter the price as a number, or leave it blank.');
      return;
    }
    if (minorUnits !== null && intent.currency === null) {
      // The database keeps price and currency together, and this screen has no
      // currency picker yet.
      setError('A price needs a currency, which is not editable here yet.');
      return;
    }

    const edit: IntentEdit = {};
    if (statementValue.trim() !== intent.statement) edit.statement = statementValue.trim();
    if ((placeValue.trim() || null) !== intent.approximatePlace) {
      edit.approximatePlace = placeValue.trim() || null;
    }
    if (minorUnits !== intent.priceMinor) {
      edit.priceMinor = minorUnits;
      edit.currency = minorUnits === null ? null : intent.currency;
    }

    if (Object.keys(edit).length === 0) {
      setError('Nothing has changed yet.');
      return;
    }

    setSaving(true);
    setError(null);
    const result = await updateIntent(intent.id, intent.version, edit);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await queryClient.invalidateQueries();
    router.back();
  }

  const willNotify = intent.status === 'live' && intent.responseCount > 0;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>
          Edit intent
        </Text>

        {willNotify ? (
          <View style={styles.notice} testID="edit-notice">
            <Text style={styles.noticeBody}>
              {intent.responseCount === 1
                ? '1 person has already responded. They will be told what changed.'
                : `${intent.responseCount} people have already responded. They will be told what changed.`}
            </Text>
          </View>
        ) : null}

        <Text style={styles.label}>What you are asking for</Text>
        <TextInput
          accessibilityLabel="Intent statement"
          maxLength={500}
          multiline
          onChangeText={setStatement}
          style={[styles.input, styles.inputMultiline]}
          value={statementValue}
        />

        <Text style={styles.label}>Area</Text>
        <TextInput
          accessibilityLabel="Approximate area"
          maxLength={120}
          onChangeText={setPlace}
          placeholder="Leave blank to remove"
          placeholderTextColor={tokens.semantic.color.textMuted}
          style={styles.input}
          value={placeValue}
        />
        <Text style={styles.hint}>
          An area only. Never an address — exact location is released to one person at a time,
          inside a coordination room.
        </Text>

        <Text style={styles.label}>
          {intent.currency ? `Price (${intent.currency})` : 'Price'}
        </Text>
        <TextInput
          accessibilityLabel="Price"
          inputMode="decimal"
          onChangeText={setPrice}
          placeholder="Leave blank for no price"
          placeholderTextColor={tokens.semantic.color.textMuted}
          style={styles.input}
          value={priceValue}
        />

        {error ? (
          <Text accessibilityRole="alert" style={styles.error} testID="edit-error">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Save changes" loading={saving} onPress={() => void save()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundApp },
  content: { padding: 20, gap: 8 },
  title: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 20, lineHeight: 26 },
  notice: { marginTop: 4, padding: 14, borderRadius: tokens.primitive.radius.card, backgroundColor: tokens.semantic.color.backgroundInfo },
  noticeBody: { color: tokens.semantic.color.actionSecondary, fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18 },
  label: { marginTop: 10, color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  input: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderRadius: tokens.primitive.radius.row, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle, backgroundColor: tokens.semantic.color.backgroundSurface, color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_400Regular', fontSize: 16 },
  inputMultiline: { minHeight: 120, textAlignVertical: 'top' },
  hint: { color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18 },
  error: { marginTop: 8, color: tokens.semantic.color.statusDanger, fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: tokens.semantic.color.borderSubtle },
});
