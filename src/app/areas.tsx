import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { Tag } from '@/design-system/components/tag';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { removeApprovedArea, useMe } from '@/features/me/me-store';

/**
 * approved areas manager. your list widens where "approved
 * neighborhoods" reach can fire. removing an area is instant — a cast
 * you posted in a removed area stays where it is; new casts you post
 * or receive stop landing there.
 */
export default function AreasScreen() {
  const me = useMe();

  function add() {
    haptic('selection');
    // the picker, not a text field: an area without a point behind it
    // can only be matched by name, so a typed one quietly stops
    // reaching people who spell the place differently.
    router.push('/area?target=areas');
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

          <SheetNote>casts show the neighbourhood only. an exact spot is never stored. you settle exactly where in chat, once you&apos;ve matched.</SheetNote>
        </ScrollView>

        <View style={styles.actions}>
          <BarButton label="add an area" variant="onOrange" onPress={add} />
          <QuietAction label="done" color={tokens.semantic.color.ink} onPress={() => router.back()} />
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
  actions: { marginTop: 18, gap: 2 },
});
