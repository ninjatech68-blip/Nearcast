import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { StatePanel, type ScreenState } from '@/design-system/components/state-panel';
import { tokens } from '@/design-system/tokens';
import { PRIMITIVE_LABELS } from '@/features/intents/data/intent-queries';
import { supabase } from '@/infrastructure/supabase/client';

type PublicIntent = {
  statement: string;
  primitive: keyof typeof PRIMITIVE_LABELS;
  responseAction: string;
  approximatePlace: string | null;
  broadcasterFirstName: string | null;
  confirmationCount: number;
  expiresAt: string;
};

/**
 * The only anonymous surface. It reads through get_public_intent, the
 * privacy-safe projection, and never touches a domain table directly.
 */
export default function PublicIntentScreen() {
  const { shareSlug } = useLocalSearchParams<{ shareSlug: string }>();

  const projection = useQuery({
    queryKey: ['public-intent', shareSlug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_intent', {
        requested_share_slug: shareSlug ?? '',
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const row = projection.data;
  const state: ScreenState | { kind: 'content'; intent: PublicIntent } = projection.isPending
    ? { kind: 'loading' }
    : projection.isError
      ? { kind: 'error', message: 'We could not load this intent. Try again.' }
      : !row
        ? {
            // Closed, expired, withdrawn and never-existed all look identical
            // so a link cannot probe whether private records exist.
            kind: 'empty',
            title: 'This intent is not available',
            body: 'It may have been resolved, withdrawn, or expired.',
          }
        : {
            kind: 'content',
            intent: {
              statement: row.statement,
              primitive: row.primitive,
              responseAction: row.response_action,
              approximatePlace: row.approximate_place,
              broadcasterFirstName: row.broadcaster_first_name,
              confirmationCount: Number(row.confirmation_count ?? 0),
              expiresAt: row.expires_at,
            },
          };

  if (state.kind !== 'content') {
    return (
      <SafeAreaView style={styles.screen}>
        <StatePanel onRetry={() => void projection.refetch()} state={state} />
      </SafeAreaView>
    );
  }

  const { intent } = state;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.primitive}>{PRIMITIVE_LABELS[intent.primitive]}</Text>
        <Text accessibilityRole="header" style={styles.statement}>
          {intent.statement}
        </Text>
        {intent.approximatePlace ? (
          <Text style={styles.meta}>{intent.approximatePlace} area</Text>
        ) : null}

        <View style={styles.provenance}>
          <Text style={styles.provenanceText}>
            {intent.confirmationCount === 0
              ? 'No confirmations yet.'
              : intent.confirmationCount === 1
                ? 'Confirmed by 1 person at the origin.'
                : `Confirmed by ${intent.confirmationCount} people at the origin.`}
          </Text>
          <Text style={styles.provenanceHint}>
            Confirmation means someone recognises or supports this intent. It does not guarantee
            attendance, accuracy, or safety.
          </Text>
        </View>

        {intent.broadcasterFirstName ? (
          <Text style={styles.meta}>Shared by {intent.broadcasterFirstName}</Text>
        ) : null}

        <Text style={styles.privacy}>
          No exact address or contact details are shown. The originating group stays private.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button label={intent.responseAction} onPress={() => router.push('/sign-in')} />
        <Text style={styles.footerHint}>You will be asked to sign in before responding.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.backgroundApp },
  content: { padding: 20, gap: 10 },
  primitive: {
    color: tokens.semantic.color.actionPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  statement: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    lineHeight: 26,
  },
  meta: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_400Regular',
    fontSize: 16,
  },
  provenance: {
    marginTop: 8,
    padding: 16,
    borderRadius: tokens.primitive.radius.card,
    backgroundColor: tokens.semantic.color.backgroundInfo,
    gap: 6,
  },
  provenanceText: {
    color: tokens.semantic.color.actionSecondary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
  },
  provenanceHint: {
    color: tokens.semantic.color.actionSecondary,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  privacy: {
    marginTop: 8,
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.borderSubtle,
  },
  footerHint: {
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
});
