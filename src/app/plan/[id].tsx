import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { Face } from '@/design-system/components/face';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { Tag } from '@/design-system/components/tag';
import { category as categoryTokens, fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos, isVerified } from '@/features/casts/faces';
import { usePlanDetail } from '@/features/casts/plan-detail';

/**
 * The plan detail: what a plan actually is, for someone in it.
 *
 * "you're in" and "your casts" used to only open a chat or a bare row.
 * This is the plan itself — category, the full description, the
 * neighbourhood and how far it reaches, when it happens, and who is in
 * it. Opened from a joiner's side (with a chat button) and the caster's
 * side (edit while nobody has engaged, or just back).
 */
export default function PlanDetailScreen() {
  const { id, chat } = useLocalSearchParams<{ id: string; chat?: string }>();
  const { plan, loading } = usePlanDetail(id);

  if (loading) {
    return (
      <SheetShell title="loading…">
        <View style={styles.actions}>
          <BarButton label="back" variant="onCream" onPress={() => router.back()} />
        </View>
      </SheetShell>
    );
  }

  if (!plan) {
    return (
      <SheetShell title="not around.">
        <Text style={styles.sub}>this plan is no longer here, or you are not part of it.</Text>
        <View style={styles.actions}>
          <BarButton label="back" variant="onCream" onPress={() => router.back()} />
        </View>
      </SheetShell>
    );
  }

  const spec = categoryTokens[plan.category];
  const others = plan.participantNames;
  const whenLabel = plan.startsAt ? formatWhen(plan.startsAt) : 'whenever it comes together';
  const reach = plan.radiusKm ? `${plan.area} · within ${plan.radiusKm} km` : plan.area;

  return (
    <SheetShell title={plan.statement}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.tags}>
          <Tag label={spec.label} tone="line" />
          {plan.isMine ? <Tag label="your cast" tone="dim" /> : null}
          {plan.status === 'matched' ? <Tag label="matched" tone="hot" /> : null}
        </View>

        <Text style={styles.rowLabel}>WHEN</Text>
        <Text style={styles.rowValue}>{whenLabel}</Text>
        <Text style={styles.rowSub}>{plan.expiryLabel}</Text>

        <Text style={styles.rowLabel}>WHERE</Text>
        <Text style={styles.rowValue}>{reach}</Text>
        {plan.latitude !== null && plan.longitude !== null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="open the area in maps"
            onPress={() =>
              Linking.openURL(
                Platform.OS === 'ios'
                  ? `http://maps.apple.com/?ll=${plan.latitude},${plan.longitude}`
                  : `geo:${plan.latitude},${plan.longitude}`,
              )
            }
          >
            <Text style={styles.mapLink}>open the area in maps ›</Text>
          </Pressable>
        ) : null}
        <Text style={styles.rowSub}>the exact spot is settled in chat, never stored here.</Text>

        <Text style={styles.rowLabel}>WHO</Text>
        <View style={styles.people}>
          <Face
            photo={facePhotos[plan.casterId]}
            initials={plan.casterName.slice(0, 2).toUpperCase()}
            size={36}
            label={`photo of ${plan.casterName}`}
            verified={isVerified(plan.casterId)}
          />
          <Text style={styles.rowValue}>{plan.isMine ? 'you' : plan.casterName} cast this</Text>
        </View>
        <Text style={styles.rowSub}>
          {plan.participantCount === 0
            ? 'nobody has joined yet.'
            : `${plan.participantCount} ${plan.participantCount === 1 ? 'person is' : 'people are'} in: ${others.join(', ')}`}
        </Text>

        <SheetNote>casts show the neighbourhood, never an exact spot. you settle exactly where in chat.</SheetNote>
      </ScrollView>

      <View style={styles.actions}>
        {plan.isMine ? (
          <>
            {plan.participantCount === 0 && plan.status === 'live' ? (
              <BarButton
                label="edit this cast"
                variant="onOrange"
                onPress={() => router.push(`/edit-cast/${plan.intentId}`)}
              />
            ) : null}
            <QuietAction label="back" color={tokens.semantic.color.ink} onPress={() => router.back()} />
          </>
        ) : (
          <>
            <BarButton label="open chat" variant="onOrange" onPress={() => router.push(`/chat/${chat ?? plan.intentId}`)} />
            <QuietAction label="back" color={tokens.semantic.color.ink} onPress={() => router.back()} />
          </>
        )}
      </View>
    </SheetShell>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${day} · ${h}:${m} ${ampm}`;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  sub: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  tags: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 4 },
  rowLabel: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 22, marginBottom: 4 },
  rowValue: { fontFamily: fontFamily.displaySemi, fontSize: 17, color: tokens.semantic.color.ink },
  rowSub: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 4 },
  mapLink: { fontFamily: fontFamily.displaySemi, fontSize: 15, color: tokens.semantic.color.accent, marginTop: 6 },
  people: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: { marginTop: 18, gap: 2 },
});
