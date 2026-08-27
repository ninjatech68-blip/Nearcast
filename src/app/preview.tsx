import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { findPrivacyViolations, type PrivacyViolation } from '@/design-system/privacy';
import { clearDraft, loadDraft, saveDraft } from '@/features/intents/data/draft-store';
import { INTENT_REACH_LEVELS, defaultResponseAction, type IntentPrimitive, type IntentReachLevel } from '@/features/intents/domain/intent';
import { createIdempotencyKey } from '@/features/intents/domain/idempotency-key';
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

/**
 * Said once, before publishing, and never as a block: the words are the
 * broadcaster's own. The database and the disclosure rules are what actually
 * keep exact location and contact details out of discoverable rows; this is
 * the moment to point out that everyone this reaches will read the text.
 */
const PRIVACY_WARNINGS: Record<PrivacyViolation, string> = {
  exactLocation:
    'This looks like it includes an exact address. Everyone this reaches will see it — an approximate area is usually enough, and you can share the exact place with one person after you accept them.',
  contactDetails:
    'This looks like it includes contact details. Everyone this reaches will see them — you can share them privately once you accept someone.',
};

export default function PreviewScreen() {
  const params = useLocalSearchParams<{ primitive: string; statement: string }>();
  const primitive = (params.primitive ?? 'request') as IntentPrimitive;
  const statement = params.statement ?? '';

  const privacyWarnings = findPrivacyViolations(statement);
  const [stored] = useState(() => loadDraft());
  const [reach, setReach] = useState<IntentReachLevel>(stored?.reach ?? 'origin_only');
  const [publicLink, setPublicLink] = useState(stored?.publicLinkEnabled ?? true);
  const [showFirstName, setShowFirstName] = useState(stored?.showFirstName ?? true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [heldForReview, setHeldForReview] = useState(false);
  const [idempotencyKey] = useState(createIdempotencyKey);

  // The reach and disclosure choices belong to the same local draft, so backing
  // out of review and returning does not silently reset them.
  function persistChoices(next: {
    reach?: IntentReachLevel;
    publicLinkEnabled?: boolean;
    showFirstName?: boolean;
  }) {
    saveDraft({
      primitive,
      statement,
      reach: next.reach ?? reach,
      publicLinkEnabled: next.publicLinkEnabled ?? publicLink,
      showFirstName: next.showFirstName ?? showFirstName,
      updatedAt: new Date().toISOString(),
    });
  }

  function changeReach(level: IntentReachLevel) {
    setReach(level);
    persistChoices({ reach: level });
  }

  function changePublicLink(value: boolean) {
    setPublicLink(value);
    persistChoices({ publicLinkEnabled: value });
  }

  function changeShowFirstName(value: boolean) {
    setShowFirstName(value);
    persistChoices({ showFirstName: value });
  }

  async function publish() {
    setPublishing(true);
    setError(null);
    setOffline(false);
    setHeldForReview(false);
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 3_600_000).toISOString();
    const result = await publishIntent({
      primitive,
      statement,
      // Match the call-to-action to the primitive: "Offer help" on an "I offer"
      // intent reads as the recipient offering, and on an "I want to" intent
      // it makes no sense at all. Broadcasters can still override at edit time.
      responseAction: defaultResponseAction(primitive),
      expiresAt,
      approximatePlace: null,
      reach,
      publicLinkEnabled: publicLink,
      showFirstName,
      idempotencyKey,
    });
    setPublishing(false);
    if (result.state === 'error') {
      // The draft stays on the device. Publishing never reports success it did
      // not get from the server.
      setError(result.message);
      setOffline(result.offline);
      return;
    }
    // Held for review by the content check. Nothing reached anyone, and the
    // draft stays on the device: saying "published" here would be false.
    if (result.status === 'restricted') {
      setHeldForReview(true);
      return;
    }

    // Published: the intent now lives on the server, so the local copy goes.
    clearDraft();
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

        {privacyWarnings.length > 0 ? (
          <View style={styles.privacyWarning} testID="privacy-warning">
            {privacyWarnings.map((violation) => (
              <Text key={violation} style={styles.privacyWarningBody}>
                {PRIVACY_WARNINGS[violation]}
              </Text>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>How far should this intent travel?</Text>
        {INTENT_REACH_LEVELS.map((level) => {
          const selected = reach === level;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={level}
              onPress={() => changeReach(level)}
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
          <Switch onValueChange={changePublicLink} value={publicLink} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Show my first name</Text>
          <Switch onValueChange={changeShowFirstName} value={showFirstName} />
        </View>

        <View style={styles.privacyBox}>
          <Text style={styles.privacyTitle}>What stays private</Text>
          <Text style={styles.privacyBody}>No exact address or contact details shown.</Text>
          <Text style={styles.privacyBody}>Reach never expands without your action.</Text>
          <Text style={styles.privacyBody}>
            This intent expires in {DEFAULT_EXPIRY_HOURS} hours unless you resolve it sooner.
          </Text>
        </View>

        {heldForReview ? (
          <View style={styles.privacyWarning} testID="publish-held">
            <Text style={styles.privacyWarningBody}>
              This intent is being reviewed before it goes anywhere. Nothing has been shared yet.
              We will not publish it without a decision, and you can edit or withdraw it in the
              meantime.
            </Text>
          </View>
        ) : null}

        {error ? (
          <Text
            accessibilityRole="alert"
            style={offline ? styles.offline : styles.error}
            testID={offline ? 'publish-offline' : 'publish-error'}>
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
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundApp },
  content: { padding: 20, gap: 10 },
  title: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 20, lineHeight: 26 },
  previewCard: { padding: 16, borderRadius: tokens.primitive.radius.card, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle, backgroundColor: tokens.semantic.color.backgroundSurface, gap: 6 },
  primitive: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 11, textTransform: 'uppercase' },
  statement: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 16, lineHeight: 24 },
  previewNote: { color: tokens.semantic.color.textMuted, fontFamily: 'Manrope_400Regular', fontSize: 11 },
  privacyWarning: { padding: 14, borderRadius: tokens.primitive.radius.card, backgroundColor: tokens.semantic.color.backgroundWarning, gap: 6 },
  privacyWarningBody: { color: tokens.semantic.color.onWarning, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18 },
  sectionTitle: { marginTop: 14, color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_700Bold', fontSize: 16 },
  reachOption: { padding: 14, borderRadius: tokens.primitive.radius.button, borderWidth: 1, borderColor: tokens.semantic.color.borderSubtle, backgroundColor: tokens.semantic.color.backgroundSurface, gap: 4 },
  reachSelected: { borderColor: tokens.semantic.color.actionPrimary, backgroundColor: tokens.semantic.color.backgroundSuccess },
  reachTitle: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 16 },
  reachTitleSelected: { color: tokens.semantic.color.actionPrimary },
  reachExposes: { color: tokens.semantic.color.textSecondary, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  toggleLabel: { color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_400Regular', fontSize: 16 },
  privacyBox: { marginTop: 8, padding: 16, borderRadius: tokens.primitive.radius.card, backgroundColor: tokens.semantic.color.backgroundSuccess, gap: 5 },
  privacyTitle: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 16 },
  privacyBody: { color: tokens.semantic.color.actionPrimary, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18 },
  offline: { padding: 14, borderRadius: tokens.primitive.radius.card, backgroundColor: tokens.semantic.color.backgroundWarning, color: tokens.semantic.color.textPrimary, fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18 },
  error: { color: tokens.semantic.color.statusDanger, fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: tokens.semantic.color.borderSubtle },
});
