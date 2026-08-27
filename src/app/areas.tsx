import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BarButton } from '@/design-system/components/button';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { Tag } from '@/design-system/components/tag';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { addApprovedArea, removeApprovedArea, useMe } from '@/features/me/me-store';

/**
 * approved areas manager. your list widens where "approved
 * neighborhoods" reach can fire. removing an area is instant — a cast
 * you posted in a removed area stays where it is; new casts you post
 * or receive stop landing there.
 */
export default function AreasScreen() {
  const me = useMe();
  const [next, setNext] = useState('');

  function add() {
    const trimmed = next.trim().toLowerCase();
    if (!trimmed || me.approvedAreas.includes(trimmed)) return;
    haptic('success');
    addApprovedArea(trimmed);
    setNext('');
  }

  function remove(area: string) {
    haptic('light');
    removeApprovedArea(area);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <SheetShell title="your areas">
        <ScrollView showsVerticalScrollIndicator={false} style={styles.flex}>
          <Text style={styles.hint}>casts near these neighborhoods can reach you. always approximate.</Text>

          <View style={styles.rows}>
            {me.approvedAreas.map((area) => (
              <View key={area} style={styles.row}>
                <Text style={styles.rowText}>{area}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`remove ${area}`}
                  onPress={() => remove(area)}
                  style={styles.removeTap}
                >
                  <Tag label="remove" tone="line" />
                </Pressable>
              </View>
            ))}
            {me.approvedAreas.length === 0 ? (
              <Text style={styles.empty}>no areas yet. add one to widen the reach.</Text>
            ) : null}
          </View>

          <Text style={styles.addLabel}>ADD AN AREA</Text>
          <TextInput
            accessibilityLabel="new area name"
            value={next}
            onChangeText={setNext}
            placeholder="e.g. jayanagar"
            placeholderTextColor={tokens.semantic.color.hairlineOnCream}
            selectionColor={tokens.semantic.color.accent}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={add}
            returnKeyType="done"
          />
          <SheetNote>casts show the area only. the exact spot stays hidden until you and the caster are both in.</SheetNote>
        </ScrollView>

        <View style={styles.actions}>
          <BarButton
            label={next.trim() ? `add ${next.trim().toLowerCase()}` : 'done'}
            variant={next.trim() ? 'onOrange' : 'onCream'}
            onPress={next.trim() ? add : () => router.back()}
          />
        </View>
      </SheetShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hint: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 4 },
  rows: { marginTop: 18 },
  row: {
    minHeight: 52,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.hairlineOnCream,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: { fontFamily: fontFamily.displaySemi, fontSize: 17, color: tokens.semantic.color.ink, flex: 1 },
  removeTap: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  empty: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 20 },
  addLabel: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 26, marginBottom: 8 },
  input: {
    minHeight: 52,
    borderRadius: tokens.primitive.radius.control,
    borderWidth: 1.5,
    borderColor: tokens.semantic.color.accent,
    paddingHorizontal: 14,
    fontFamily: fontFamily.text,
    fontSize: 17,
    color: tokens.semantic.color.ink,
  },
  actions: { marginTop: 18, gap: 2 },
});
