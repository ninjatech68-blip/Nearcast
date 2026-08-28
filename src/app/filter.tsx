import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { haptic } from '@/design-system/haptics';
import { CATEGORIES, category as categoryTokens, fontFamily, tokens, type Category } from '@/design-system/tokens';
import { feedCountFor, setFilter, setQuery, useFilter, useQuery } from '@/features/casts/store';

/**
 * the session lens: text AND categories. multi-select, resets when you
 * leave the feed, and never trains delivery — that is what onboarding
 * interests are for. the primary button carries the honest count
 * before it applies.
 *
 * search narrows what you were already delivered. it cannot surface a
 * cast the delivery framework decided not to send you — otherwise it
 * would be a back door around reach.
 */
export default function FilterScreen() {
  const current = useFilter();
  const currentQuery = useQuery();
  const [picked, setPicked] = useState<readonly Category[]>(current ?? []);
  const [text, setText] = useState(currentQuery);

  function toggle(id: Category) {
    haptic('selection');
    setPicked((now) => (now.includes(id) ? now.filter((item) => item !== id) : [...now, id]));
  }

  function apply() {
    setFilter(picked.length > 0 ? picked : null);
    setQuery(text.trim());
    router.back();
  }

  function clear() {
    setFilter(null);
    setQuery('');
    router.back();
  }

  const count = feedCountFor(picked.length > 0 ? picked : null, text);
  const narrowed = picked.length > 0 || text.trim().length > 0;

  return (
    <SheetShell title="show me">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.scroll}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.scroll}>
        <TextInput
          accessibilityLabel="search casts"
          value={text}
          onChangeText={setText}
          placeholder="search casts, people, areas"
          placeholderTextColor={tokens.semantic.color.hairlineOnCream}
          selectionColor={tokens.semantic.color.accent}
          style={styles.search}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={apply}
          clearButtonMode="while-editing"
        />
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
        <SheetNote>
          resets when you leave the feed. search narrows what you already have — it never reaches past who a cast was sent to.
        </SheetNote>
      </ScrollView>

      <View style={styles.actions}>
        <BarButton
          label={!narrowed ? 'show everything' : `show ${count} ${count === 1 ? 'cast' : 'casts'}`}
          variant="onOrange"
          onPress={apply}
        />
        <QuietAction label="clear" color={tokens.semantic.color.ink} onPress={clear} />
      </View>
      </KeyboardAvoidingView>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  search: {
    minHeight: 52,
    borderRadius: tokens.primitive.radius.control,
    borderWidth: 1.5,
    borderColor: tokens.semantic.color.accent,
    paddingHorizontal: 14,
    fontFamily: fontFamily.text,
    fontSize: 17,
    color: tokens.semantic.color.ink,
    marginTop: 14,
  },
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
