import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SignalBars } from '@/design-system/components/bars';
import { BarButton, QuietAction } from '@/design-system/components/button';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { fontFamily, tokens } from '@/design-system/tokens';
import { getCast, slotsFor } from '@/features/casts/store';

/**
 * the detail sheet. receipts show at the decision moment:
 * attendance facts, never a rating.
 */
export default function CastDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cast = getCast(id ?? '');

  if (!cast) {
    return (
      <SheetShell title="this one's gone.">
        <Text style={styles.goneSub}>it ended or got filled.</Text>
        <View style={styles.actions}>
          <BarButton label="back" variant="onCream" onPress={() => router.back()} />
        </View>
      </SheetShell>
    );
  }

  return (
    <SheetShell title={`${cast.by} cast this`}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`about ${cast.by}`}
          onPress={() => router.push(`/caster/${cast.byId}`)}
          hitSlop={8}
        >
          <Text style={styles.byLine}>{cast.byLine} ›</Text>
          <View style={styles.receipts}>
            <SignalBars lit={cast.receipts.lit} size="small" trackColor={tokens.semantic.color.ink} />
            <Text style={styles.receiptsLine}>{cast.receipts.line}</Text>
          </View>
        </Pressable>
        <Text style={styles.body}>{cast.body}</Text>
        <Text style={styles.slots}>{slotsLine(cast)}</Text>
        <SheetNote>the exact place stays hidden until you&apos;re both in. chat is in-app — nobody exchanges numbers.</SheetNote>
      </ScrollView>
      <View style={styles.actions}>
        {slotsFor(cast).full ? (
          <BarButton label="full — no slots left" variant="onCream" disabled onPress={() => undefined} />
        ) : (
          <BarButton label="I'm in" variant="onOrange" onPress={() => router.push(`/join/${cast.id}`)} />
        )}
        <QuietAction label="skip" color={tokens.semantic.color.ink} onPress={() => router.back()} />
      </View>
    </SheetShell>
  );
}

function slotsLine(cast: ReturnType<typeof getCast>): string {
  if (!cast) return '';
  const s = slotsFor(cast);
  if (s.full) return `full — ${s.filled} in`;
  return `${s.filled} in · ${s.remaining} ${s.remaining === 1 ? 'slot' : 'slots'} left of ${s.wanted}`;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  byLine: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 4 },
  receipts: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  receiptsLine: { ...tokens.typography.meta, color: tokens.semantic.color.ink },
  body: {
    fontFamily: fontFamily.text,
    fontSize: 17,
    lineHeight: 25,
    color: tokens.semantic.color.ink,
    marginTop: 16,
  },
  slots: {
    ...tokens.typography.meta,
    color: tokens.semantic.color.accent,
    marginTop: 14,
  },
  goneSub: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  actions: { marginTop: 18, gap: 2 },
});
