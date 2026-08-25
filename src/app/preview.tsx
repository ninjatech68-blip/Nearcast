import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { INTENT_REACH_LEVELS, type IntentPrimitive, type IntentReachLevel } from '@/features/intents/domain/intent';
import { publishIntent, PRIMITIVE_LABELS } from '@/features/intents/data/intent-queries';

const REACH_COPY: Record<IntentReachLevel, { title: string; exposes: string }> = {
  origin_only: {
    title: 'My trusted circles',
    exposes: 'Only people you already share a circle with can see this.',
  },
  adjacent_network: {
    title: 'People connected to my circles',
    exposes: 'One connection beyond your circle. Your circle is never named.',
  },
  nearby_relevant: {
    title: 'Relevant people nearby',
    exposes: 'People in your approximate area whose interests match. Exact place stays hidden.',
  },
  broader_approved: {
    title: 'Broader approved reach',
    exposes: 'The widest approved audience. Your first name and approximate area are shown.',
  },
};

const DEFAULT_EXPIRY_HOURS = 48;

export default function PreviewScreen() {
  const params = useLocalSearchParams<{ primitive: string; statement: string }>();
  const primitive = (params.primitive ?? 'request') as IntentPrimitive;
  const statement = params.statement ?? '';

  const [reach, setReach] = useState<IntentReachLevel>('origin_only');
  const [publicLink, setPublicLink] = useState(true);
  const [showFirstName, setShowFirstName] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => globalThis.crypto.randomUUID());

  async function publish() {
    setPublishing(true);
    setError(null);
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 3_600_000).toISOString();
    const result = await publishIntent({
      primitive,
      statement,
      responseAction: 'Offer help',
      expiresAt,
      approximatePlace: null,
      reach,
      publicLinkEnabled: publicLink,
      showFirstName,
      idempotencyKey,
    });
    setPublishing(false);
    if (result.state === 'error') {
      setError(result.message);
      return;
    }
    router.replace(`/intent/${result.intentId}`);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Review intent
        </Text>

        <View style={styles.previewCard}>
          <Text style={styles.primitive}>{PRIMITIVE_LABELS[primitive]}</Text>
          <Text style={styles.statement}>{statement}</Text>
          <Text style={styles.previewNote}>This is what recipients will see.</Text>
        </View>

        <Text style={styles.sectionTitle}>How far should this intent travel?</Text>
        {INTENT_REACH_LEVELS.map((level) => {
          const selected = reach === level;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={level}
              onPress={() => setReach(level)}
              style={[styles.reachOption, selected && styles.reachSelected]}>
              <Text style={[styles.reachTitle, selected && styles.reachTitleSelected]}>
                {REACH_COPY[level].title}
              </Text>
              <Text style={styles.reachExposes}>{REACH_COPY[level].exposes}</Text>
            </Pressable>
          );
        })}

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Allow a shareable link</Text>
          <Switch onValueChange={setPublicLink} value={publicLink} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Show my first name</Text>
          <Switch onValueChange={setShowFirstName} value={showFirstName} />
        </View>

        <View style={styles.privacyBox}>
          <Text style={styles.privacyTitle}>What stays private</Text>
          <Text style={styles.privacyBody}>No exact address or contact details shown.</Text>
          <Text style={styles.privacyBody}>Reach never expands without your action.</Text>
          <Text style={styles.privacyBody}>
            This intent expires in {DEFAULT_EXPIRY_HOURS} hours unless you resolve it sooner.
          </Text>
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          disabled={statement.trim().length === 0}
          label="Broadcast intent"
          loading={publishing}
          onPress={() => void publish()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { padding: 20, gap: 10 },
  title: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 22, lineHeight: 28 },
  previewCard: { padding: 16, borderRadius: tokens.primitive.radius.card, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, backgroundColor: tokens.semantic.color.backgroundSurface, gap: 6 },
  primitive: { color: tokens.semantic.color.trustText, fontFamily: 'Manrope_600SemiBold', fontSize: 12, textTransform: 'uppercase' },
  statement: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 17, lineHeight: 24 },
  previewNote: { color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_400Regular', fontSize: 12 },
  sectionTitle: { marginTop: 14, color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 17 },
  reachOption: { padding: 14, borderRadius: tokens.primitive.radius.control, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, backgroundColor: tokens.semantic.color.backgroundSurface, gap: 4 },
  reachSelected: { borderColor: tokens.semantic.color.actionPrimary, backgroundColor: tokens.semantic.color.trustSurface },
  reachTitle: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  reachTitleSelected: { color: tokens.semantic.color.trustText },
  reachExposes: { color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  toggleLabel: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_400Regular', fontSize: 15 },
  privacyBox: { marginTop: 8, padding: 16, borderRadius: tokens.primitive.radius.card, backgroundColor: tokens.semantic.color.trustSurface, gap: 5 },
  privacyTitle: { color: tokens.semantic.color.trustText, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  privacyBody: { color: tokens.semantic.color.trustText, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19 },
  error: { color: tokens.semantic.color.dangerText, fontFamily: 'Manrope_600SemiBold', fontSize: 14, lineHeight: 20 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: tokens.semantic.color.borderDefault },
});
