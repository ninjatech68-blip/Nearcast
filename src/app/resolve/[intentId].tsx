import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import {
  resolveIntent,
  RESOLUTION_OUTCOMES,
} from '@/features/coordination/queries';
import type { Database } from '@/infrastructure/supabase/database.types';

type Outcome = Database['public']['Enums']['resolution_outcome'];
type IntentStatus = Database['public']['Enums']['intent_status'];

/**
 * ResolutionSheet: one factual outcome, an honest note about which outcome
 * affects reliability, and a separate unambiguous withdraw action. No
 * celebration of failure states, no pressure toward a positive answer.
 */
export default function ResolveIntentScreen() {
  const { intentId, status } = useLocalSearchParams<{ intentId: string; status: string }>();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Outcome | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expectedStatus = (status === 'matched' ? 'matched' : 'live') as IntentStatus;

  async function submit(outcome: Outcome) {
    setSubmitting(true);
    setError(null);
    const result = await resolveIntent(intentId ?? '', expectedStatus, outcome);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await queryClient.invalidateQueries();
    router.back();
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Was your intent resolved?
        </Text>

        {RESOLUTION_OUTCOMES.map((option) => {
          const isSelected = selected === option.outcome;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              key={option.outcome}
              onPress={() => setSelected(option.outcome)}
              style={[styles.option, isSelected && styles.optionSelected]}>
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                {option.label}
              </Text>
              {option.affectsReliability ? (
                <Text style={styles.optionHint}>
                  Counts toward reliability once the other person confirms it happened.
                </Text>
              ) : null}
            </Pressable>
          );
        })}

        <Text style={styles.note}>
          Closing this intent stops new responses immediately. Only “Resolved through Nearcast”,
          confirmed by the other person, affects reliability.
        </Text>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          onPress={() => void submit('withdrawn')}
          style={({ pressed }) => [styles.withdraw, pressed && styles.withdrawPressed]}>
          <Text style={styles.withdrawLabel}>Withdraw intent</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          disabled={selected === null}
          label="Resolve intent"
          loading={submitting}
          onPress={() => selected && void submit(selected)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundApp },
  content: { padding: 20, gap: 10 },
  title: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 20, lineHeight: 26 },
  option: { padding: 14, borderRadius: tokens.primitive.radius.row, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle, backgroundColor: tokens.semantic.color.backgroundSurface, gap: 4 },
  optionSelected: { borderColor: tokens.semantic.color.actionPrimary, backgroundColor: tokens.semantic.color.backgroundSuccess },
  optionLabel: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 16 },
  optionLabelSelected: { color: tokens.semantic.color.actionPrimary },
  optionHint: { color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18 },
  note: { marginTop: 6, color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18 },
  error: { color: tokens.semantic.color.statusDanger, fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18 },
  withdraw: { marginTop: 10, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.primitive.radius.button, borderWidth: 1, borderColor: tokens.semantic.color.statusDanger },
  withdrawPressed: { backgroundColor: tokens.semantic.color.backgroundDanger },
  withdrawLabel: { color: tokens.semantic.color.statusDanger, fontFamily: 'Manrope_600SemiBold', fontSize: 16 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: tokens.semantic.color.borderSubtle },
});
