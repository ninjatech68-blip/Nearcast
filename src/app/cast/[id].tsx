import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SignalBars } from '@/design-system/components/bars';
import { BarButton, QuietAction } from '@/design-system/components/button';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { cancelCast, getCast } from '@/features/casts/store';

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
        <Text style={styles.reach}>{reachLine(cast)}</Text>
        <SheetNote>casts show the neighbourhood, never an exact spot. you sort out exactly where in chat — it&apos;s in-app, nobody swaps numbers.</SheetNote>
      </ScrollView>
      <View style={styles.actions}>{renderActions()}</View>
    </SheetShell>
  );

  function renderActions() {
    if (!cast) return null;
    if (cast.byId === 'me') {
      return (
        <>
          <BarButton label="back" variant="onCream" onPress={() => router.back()} />
          <QuietAction label="cancel this cast" color={tokens.semantic.color.ink} onPress={openCancel} />
        </>
      );
    }
    return (
      <>
        <BarButton label="I'm in" variant="onOrange" onPress={() => router.push(`/join/${cast.id}`)} />
        <QuietAction label="skip" color={tokens.semantic.color.ink} onPress={() => router.back()} />
      </>
    );
  }

  function openCancel() {
    if (!cast) return;
    Alert.alert(`cancel "${cast.text}"?`, 'the cast comes down. anyone matched will see it end.', [
      { text: 'never mind' },
      {
        text: 'cancel it',
        style: 'destructive',
        onPress: () => {
          haptic('light');
          cancelCast(cast.id);
          router.back();
        },
      },
    ]);
  }
}

/**
 * What a joiner is told about the shape of the plan.
 *
 * Deliberately NOT a headcount. A "1 of 3 slots left" line turns
 * asking into a race and makes an empty plan look dead — it was
 * friction on both sides of the ask. What actually helps someone
 * decide is where it is and when, so that is all this says.
 */
function reachLine(cast: ReturnType<typeof getCast>): string {
  if (!cast) return '';
  return `${cast.area} · ${cast.expiry}`;
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
  reach: {
    ...tokens.typography.meta,
    color: tokens.semantic.color.accent,
    marginTop: 14,
  },
  goneSub: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  actions: { marginTop: 18, gap: 2 },
});
