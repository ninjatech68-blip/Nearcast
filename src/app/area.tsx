import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { Row } from '@/design-system/components/row';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { areasNearMe, searchAreas } from '@/features/casts/area-lookup';
import { setDraftArea } from '@/features/casts/store';

type Status = 'idle' | 'locating' | 'searching' | 'no-permission' | 'not-found';

/**
 * the area picker, as its own screen so the keyboard has room: the field
 * stays pinned at the top and results scroll underneath it, never behind
 * the keyboard. resolves to a NAME — never a pin, never coordinates.
 */
export default function AreaScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly string[]>([]);
  const [status, setStatus] = useState<Status>('idle');

  // one shot on open: the common case is "somewhere near me"
  useEffect(() => {
    void locate();
  }, []);

  async function locate() {
    setStatus('locating');
    const result = await areasNearMe();
    if (result.ok) {
      setResults(result.areas);
      setStatus('idle');
    } else {
      setResults([]);
      setStatus(result.reason === 'permission' ? 'no-permission' : 'not-found');
    }
  }

  async function search(text: string) {
    const typed = text.trim().toLowerCase();
    if (typed.length < 2) return;
    setStatus('searching');
    const result = await searchAreas(text);
    if (result.ok) {
      setResults(result.areas);
      setStatus('idle');
    } else {
      // areas are names, not pins: the typed name is always usable
      setResults([typed]);
      setStatus('not-found');
    }
  }

  function choose(area: string) {
    haptic('selection');
    setDraftArea(area);
    router.back();
  }

  const busy = status === 'locating' || status === 'searching';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.top}>
          <Text style={styles.wordmark}>AREA</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="cancel" hitSlop={12} onPress={() => router.back()} style={styles.closeTarget}>
            <Text style={styles.close}>×</Text>
          </Pressable>
        </View>

        <Text accessibilityRole="header" style={styles.title}>
          where, roughly?
        </Text>

        <TextInput
          accessibilityLabel="search area by name"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => search(query)}
          placeholder="type an area, or use nearby"
          placeholderTextColor={tokens.semantic.color.hairlineOnCream}
          selectionColor={tokens.semantic.color.accent}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        <Pressable accessibilityRole="button" accessibilityLabel="use my location" onPress={locate} style={styles.locate}>
          <Text style={styles.locateText}>◉ use my location</Text>
        </Pressable>

        <View style={styles.resultsHead}>
          <Text style={styles.section}>{status === 'searching' ? 'MATCHES' : 'NEARBY'}</Text>
          {busy ? <ActivityIndicator color={tokens.semantic.color.accent} size="small" /> : null}
        </View>

        <ScrollView
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {results.map((area) => (
            <Row key={area} title={area} sub="stays approximate" onPress={() => choose(area)} />
          ))}
          {results.length === 0 && !busy ? (
            <Text style={styles.note}>
              {status === 'no-permission'
                ? 'location is off. type an area name instead.'
                : 'nothing nearby yet. type an area name.'}
            </Text>
          ) : null}
          {status === 'not-found' && results.length > 0 ? (
            <Text style={styles.note}>nothing matched nearby. the name still works.</Text>
          ) : null}
        </ScrollView>

        <Text style={[styles.privacy, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          casts show the area only. the exact spot stays hidden.
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.cream, paddingHorizontal: 24 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  wordmark: { ...tokens.typography.tag, color: tokens.semantic.color.textMutedOnCream },
  closeTarget: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  close: { fontFamily: fontFamily.text, fontSize: 28, lineHeight: 30, color: tokens.semantic.color.ink },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: tokens.semantic.color.ink,
    marginTop: 6,
    marginBottom: 16,
  },
  input: {
    minHeight: 52,
    borderRadius: tokens.primitive.radius.control,
    borderWidth: 1.5,
    borderColor: tokens.semantic.color.accent,
    paddingHorizontal: 14,
    fontFamily: fontFamily.displaySemi,
    fontSize: 17,
    color: tokens.semantic.color.ink,
  },
  locate: { minHeight: 44, justifyContent: 'center', marginTop: 6 },
  locateText: { fontFamily: fontFamily.displaySemi, fontSize: 15, color: tokens.semantic.color.accent },
  resultsHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 2 },
  section: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  note: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 18 },
  privacy: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, paddingTop: 10 },
});
