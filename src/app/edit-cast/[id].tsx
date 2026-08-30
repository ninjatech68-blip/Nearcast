import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { Field } from '@/design-system/components/field';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { haptic } from '@/design-system/haptics';
import { CATEGORIES, category as categoryTokens, tokens, type Category } from '@/design-system/tokens';
import { editCast, usePlanDetail } from '@/features/casts/plan-detail';
import { refreshMyCasts } from '@/features/casts/store';
import { submit } from '@/infrastructure/net/submit';

/**
 * Edit a cast you posted — the words and the category — but only while
 * nobody has engaged with it. The moment a request or match exists the
 * plan is frozen: the words people responded to cannot be swapped out
 * from under them. The backend enforces that too; this screen just does
 * not offer the edit once the plan-detail shows anyone in it.
 */
export default function EditCastScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plan, loading } = usePlanDetail(id);
  // an override that starts empty and falls back to the plan's own
  // values, so the fields show the current cast without seeding state in
  // an effect — an edit only exists once the person actually changes it.
  const [textEdit, setTextEdit] = useState<string | null>(null);
  const [pickEdit, setPickEdit] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = textEdit ?? plan?.statement ?? '';
  const pick = pickEdit ?? plan?.category ?? 'social';

  const locked = !!plan && (plan.participantCount > 0 || plan.status !== 'live');
  const ready = text.trim().length > 0 && !locked;

  async function save() {
    if (!id || !ready) return;
    setSaving(true);
    setError(null);
    const result = await submit(() => editCast(id, text, pick));
    setSaving(false);
    if (!result.ok) {
      haptic('warning');
      setError(
        result.reason === 'offline'
          ? "you're offline. your edit is here. tap when you're back."
          : "that didn't save. someone may have just joined.",
      );
      return;
    }
    haptic('success');
    await refreshMyCasts();
    router.back();
  }

  if (loading) {
    return (
      <SheetShell title="loading…">
        <View style={styles.actions}>
          <BarButton label="back" variant="onCream" onPress={() => router.back()} />
        </View>
      </SheetShell>
    );
  }

  if (locked) {
    return (
      <SheetShell title="can't edit now">
        <Text style={styles.sub}>
          someone has already engaged with this cast, so its words are set. cancel it and post a fresh one if it needs
          to change.
        </Text>
        <View style={styles.actions}>
          <BarButton label="back" variant="onCream" onPress={() => router.back()} />
        </View>
      </SheetShell>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <SheetShell title="edit your cast">
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.fieldHolder}>
            <Field value={text} onChange={setTextEdit} placeholder="what's the plan?" accessibilityLabel="your cast" fontSize={24} />
          </View>

          <Text style={styles.section}>CATEGORY</Text>
          <View style={styles.cats}>
            {CATEGORIES.map((c) => {
              const on = pick === c;
              const spec = categoryTokens[c];
              const border = spec.field === tokens.semantic.color.cream ? tokens.semantic.color.ink : spec.field;
              return (
                <Pressable
                  key={c}
                  accessibilityRole="button"
                  accessibilityLabel={spec.label}
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    haptic('selection');
                    setPickEdit(c);
                  }}
                  style={[styles.cat, on && { backgroundColor: spec.field, borderColor: border, borderWidth: 1.5 }]}
                >
                  <Text style={[styles.catText, on && { color: spec.fg }]}>{spec.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <SheetNote>you can edit until someone acts on it. after that the words are set.</SheetNote>
        </ScrollView>

        <View style={styles.actions}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <BarButton
            label={error ? 'try again' : 'save'}
            variant="onOrange"
            onPress={save}
            disabled={!ready || saving}
            loading={saving}
            loadingLabel="saving…"
          />
          <QuietAction label="never mind" color={tokens.semantic.color.ink} onPress={() => router.back()} />
        </View>
      </SheetShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sub: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  fieldHolder: { marginTop: 14 },
  section: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 20, marginBottom: 10 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: tokens.primitive.radius.pill,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    justifyContent: 'center',
  },
  catText: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  error: { ...tokens.typography.metaSmall, color: tokens.semantic.color.accent, marginBottom: 10, textAlign: 'center' },
  actions: { marginTop: 16, gap: 2 },
});
