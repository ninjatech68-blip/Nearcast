import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SignalBars } from '@/design-system/components/bars';
import { BarButton } from '@/design-system/components/button';
import { Face } from '@/design-system/components/face';
import { Row } from '@/design-system/components/row';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { Tag } from '@/design-system/components/tag';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos } from '@/features/casts/faces';
import { casters } from '@/features/casts/fixtures';
import { useFeedCasts } from '@/features/casts/store';

/**
 * the caster sheet: safety and trust facts, nothing social.
 * one verified photo, receipts and vouches, their live casts, block
 * and report. no followers, no photo grid, no bio — nothing to perform.
 */
export default function CasterProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const caster = casters.find((person) => person.id === id);
  const feed = useFeedCasts();
  const liveCasts = caster ? feed.filter((cast) => cast.byId === caster.id) : [];

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
    Alert.alert(`block ${caster?.name}?`, 'they see nothing change. you never hear from them again.', [
      { text: 'never mind' },
      { text: 'block', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  function report() {
    Alert.alert(`report ${caster?.name}?`, 'tell us what happened. they will not know it was you.', [
      { text: 'never mind' },
      { text: 'report', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  return (
    <SheetShell
      title={caster.name}
      accessory={<Face photo={facePhotos[caster.id]} initials={caster.name.slice(0, 2).toUpperCase()} size={64} label={`photo of ${caster.name}`} />}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <Text style={styles.meta}>
          {caster.area} · {caster.trustLine}
        </Text>

        <View style={styles.receipts}>
          <SignalBars lit={caster.receipts.lit} size="small" trackColor={tokens.semantic.color.ink} />
          <Text style={styles.receiptsLine}>{caster.receipts.line}</Text>
        </View>
        <Text style={styles.vouch}>{caster.vouchLine}</Text>

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

        <SheetNote>exact places + contact stay hidden until you&apos;re both in. receipts are attendance facts, not ratings.</SheetNote>
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

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  meta: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 4 },
  receipts: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  receiptsLine: { ...tokens.typography.meta, color: tokens.semantic.color.ink, flex: 1 },
  vouch: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 8 },
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
