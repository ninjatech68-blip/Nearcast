import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { haptic } from '@/design-system/haptics';
import { CATEGORIES, category as categoryTokens, tokens, type Category } from '@/design-system/tokens';
import { feedCountFor, setFilter, useFilter } from '@/features/casts/store';

/**
 * the session lens. multi-select, resets when you leave the feed, and
 * never trains delivery — that is what onboarding interests are for.
 * the primary button carries the honest count before it applies.
 */
export default function FilterScreen() {
  const current = useFilter();
  const [picked, setPicked] = useState<readonly Category[]>(current ?? []);

  function toggle(id: Category) {
    haptic('selection');
    setPicked((now) => (now.includes(id) ? now.filter((item) => item !== id) : [...now, id]));
  }

  function apply() {
    setFilter(picked.length > 0 ? picked : null);
    router.back();
  }

  function clear() {
    setFilter(null);
    router.back();
  }

  const count = feedCountFor(picked.length > 0 ? picked : null);

  return (
    <SheetShell title="show me">
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.chips}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="all"
            accessibilityState={{ selected: picked.length === 0 }}
            onPress={() => setPicked([])}
            style={[styles.chip, picked.length === 0 && styles.chipAll]}
          >
            <Text style={[styles.chipText, picked.length === 0 && styles.chipAllText]}>all</Text>
          </Pressable>
          {CATEGORIES.map((id) => {
            const item = categoryTokens[id];
            const on = picked.includes(id);
            // when a chip's field equals the sheet colour (help + favors),
            // the selected border would vanish — force an ink ring instead.
            const selectionBorder =
              item.field === tokens.semantic.color.cream ? tokens.semantic.color.ink : item.field;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: on }}
                onPress={() => toggle(id)}
                style={[
                  styles.chip,
                  on && { backgroundColor: item.field, borderColor: selectionBorder, borderWidth: 1.5 },
                ]}
              >
                <Text style={[styles.chipText, on && { color: item.fg }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <SheetNote>resets when you leave the feed. your feed never narrows silently.</SheetNote>
      </ScrollView>

      <View style={styles.actions}>
        <BarButton
          label={picked.length === 0 ? 'show everything' : `show ${count} ${count === 1 ? 'cast' : 'casts'}`}
          variant="onOrange"
          onPress={apply}
        />
        <QuietAction label="clear" color={tokens.semantic.color.ink} onPress={clear} />
      </View>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: tokens.primitive.radius.pill,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    justifyContent: 'center',
  },
  chipAll: { backgroundColor: tokens.semantic.color.ink, borderColor: tokens.semantic.color.ink },
  chipText: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  chipAllText: { color: tokens.semantic.color.cream },
  actions: { marginTop: 14, gap: 2 },
});
