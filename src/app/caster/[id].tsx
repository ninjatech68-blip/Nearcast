import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SignalBars } from '@/design-system/components/bars';
import { BarButton } from '@/design-system/components/button';
import { Face } from '@/design-system/components/face';
import { Row } from '@/design-system/components/row';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { Tag } from '@/design-system/components/tag';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos, isVerified } from '@/features/casts/faces';
import { casters } from '@/features/casts/fixtures';
import { useFeedCasts } from '@/features/casts/store';
import { hasReceiptWith, trustGraph, useCircles } from '@/features/trust/circles';
import { trustLink } from '@/features/trust/domain/trust';
import { refreshSharedHistory, useSharedHistoryWith } from '@/features/attendance/store';
import { blockCaster } from '@/features/me/me-store';

/**
 * the caster sheet: safety and trust facts, nothing social.
 * one verified photo, receipts and vouches, their live casts, block
 * and report. no followers, no photo grid, no bio — nothing to perform.
 */
export default function CasterProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const caster = casters.find((person) => person.id === id);
  const feed = useFeedCasts();
  const circles = useCircles();
  const liveCasts = caster ? feed.filter((cast) => cast.byId === caster.id) : [];

  // the trust phrase is COMPUTED from the graph, never a fixture string
  const link = caster ? trustLink(trustGraph(), 'me', caster.id) : null;
  const inCircles = caster ? circles.filter((c) => c.memberIds.includes(caster.id)) : [];
  // vouching gate: a receipt with them, OR they are already in one of
  // your circles (someone with a receipt already put them there — you
  // are adding to another, not starting a new vouch).
  const metWith = caster ? hasReceiptWith(caster.id) : false;
  const canVouch = inCircles.length > 0 || metWith;
  // computed history from the attendance store — plans you've both
  // been in and their outcomes. hooks must run every render, so the
  // call is unconditional; caster.id is empty when the profile is
  // missing and the selector returns zeros in that case.
  const shared = useSharedHistoryWith(caster?.id ?? '__none__');

  // pull real shared-history counts from the server (no-op on fixtures).
  useEffect(() => {
    if (caster?.id) void refreshSharedHistory(caster.id);
  }, [caster?.id]);

  function addTo() {
    if (!caster) return;
    // dedicated sheet — the previous Alert put the circle list next to
    // a "cancel" button of the same shape, and there was no visual
    // distinction between "add to X" and "cancel". the sheet renders
    // the list as circle rows and puts cancel below as a quiet action.
    router.push(`/vouch/${caster.id}`);
  }

  if (!caster) {
    return (
      <SheetShell title="not around.">
        <Text style={styles.goneSub}>this profile is no longer visible to you.</Text>
        <View style={styles.actions}>
          <BarButton label="back" variant="onCream" onPress={() => router.back()} />
        </View>
      </SheetShell>
    );
  }

  function block() {
    if (!caster) return;
    Alert.alert(`block ${caster.name}?`, 'they see nothing change. you never hear from them again.', [
      { text: 'never mind' },
      {
        text: 'block',
        style: 'destructive',
        onPress: () => {
          blockCaster(caster.id);
          router.back();
        },
      },
    ]);
  }

  function report() {
    if (!caster) return;
    router.push(`/report/${caster.id}`);
  }

  return (
    <SheetShell
      title={caster.name}
      accessory={<Face photo={facePhotos[caster.id]} initials={caster.name.slice(0, 2).toUpperCase()} size={64} label={`photo of ${caster.name}`} verified={isVerified(caster.id)} />}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <Text style={styles.meta}>
          {caster.area} · {link?.phrase ?? caster.trustLine}
        </Text>

        <View style={styles.receipts}>
          <SignalBars lit={caster.receipts.lit} size="small" trackColor={tokens.semantic.color.ink} />
          <Text style={styles.receiptsLine}>{caster.receipts.line}</Text>
        </View>
        <Text style={styles.vouch}>{caster.vouchLine}</Text>

        {shared.plans > 0 ? (
          <Text style={styles.withYou}>
            with you: {sharedLine(shared)}
          </Text>
        ) : null}

        {canVouch ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`vouch for ${caster.name}`} onPress={addTo} style={styles.addRow}>
            <Text style={styles.addText}>
              {inCircles.length > 0
                ? `you vouch · in your ${inCircles.map((c) => c.name).join(', ')}`
                : `+ vouch for ${caster.name}`}
            </Text>
            {inCircles.length > 0 ? <Text style={styles.addMore}>+ add to another circle</Text> : null}
          </Pressable>
        ) : (
          <View style={styles.gatedRow} accessibilityRole="text">
            <Text style={styles.gatedTitle}>vouching locked</Text>
            <Text style={styles.gatedSub}>
              you can vouch for {caster.name} after a plan you&apos;ve both been in. a receipt is the only way in.
            </Text>
          </View>
        )}

        {liveCasts.length > 0 ? (
          <>
            <Text style={styles.section}>LIVE NOW</Text>
            {liveCasts.map((cast) => (
              <Row
                key={cast.id}
                title={cast.text}
                sub={`${cast.area} · ${cast.expiry}`}
                right={<Tag label="→" tone="line" />}
                onPress={() => router.push(`/cast/${cast.id}`)}
              />
            ))}
          </>
        ) : (
          <Text style={styles.quiet}>nothing live right now.</Text>
        )}

        <SheetNote>casts show the neighbourhood, never an exact spot. you sort out exactly where in chat — it&apos;s in-app, nobody swaps numbers. receipts are attendance facts, not ratings.</SheetNote>
      </ScrollView>

      <View style={styles.safety}>
        <Pressable accessibilityRole="button" accessibilityLabel={`block ${caster.name}`} onPress={block} style={styles.safetyTap}>
          <Text style={styles.safetyText}>block</Text>
        </Pressable>
        <Text style={styles.safetyDot}>·</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`report ${caster.name}`} onPress={report} style={styles.safetyTap}>
          <Text style={styles.safetyText}>report</Text>
        </Pressable>
      </View>
    </SheetShell>
  );
}

function sharedLine(shared: { plans: number; receipts: number; flakes: number }): string {
  const plans = `${shared.plans} ${shared.plans === 1 ? 'plan' : 'plans'}`;
  const parts: string[] = [];
  if (shared.receipts > 0) parts.push(`${shared.receipts} confirmed`);
  if (shared.flakes > 0) parts.push(`${shared.flakes} flake${shared.flakes === 1 ? '' : 's'}`);
  if (parts.length === 0) parts.push('awaiting reports');
  return `${plans} · ${parts.join(' · ')}`;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  meta: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 4 },
  receipts: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  receiptsLine: { ...tokens.typography.meta, color: tokens.semantic.color.ink, flex: 1 },
  vouch: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 8 },
  withYou: { ...tokens.typography.meta, color: tokens.semantic.color.ink, marginTop: 8 },
  addRow: { minHeight: 44, justifyContent: 'center', marginTop: 12 },
  addText: { fontFamily: fontFamily.displaySemi, fontSize: 15, color: tokens.semantic.color.accent },
  addMore: { ...tokens.typography.metaSmall, color: tokens.semantic.color.accent, marginTop: 2 },
  gatedRow: {
    minHeight: 44,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: tokens.primitive.radius.control,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
  },
  gatedTitle: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  gatedSub: { ...tokens.typography.metaSmall, color: tokens.semantic.color.ink, marginTop: 3 },
  section: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 28, marginBottom: 4 },
  quiet: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 28 },
  goneSub: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  actions: { marginTop: 18 },
  safety: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 10,
  },
  safetyTap: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  safetyText: { fontFamily: fontFamily.displaySemi, fontSize: 14, color: tokens.semantic.color.textMutedOnCream },
  safetyDot: { color: tokens.semantic.color.hairlineOnCream },
});
