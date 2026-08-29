import { useEffect } from 'react';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarButton } from '@/design-system/components/button';
import { Face } from '@/design-system/components/face';
import { Row } from '@/design-system/components/row';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { Tag } from '@/design-system/components/tag';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos, isVerified } from '@/features/casts/faces';
import { refreshAttendance, useMyPastPlans } from '@/features/attendance/store';
import { useRefresher } from '@/infrastructure/net/use-refresher';
import { people } from '@/features/trust/circles';
import type { Outcome } from '@/features/casts/domain/attendance';

/**
 * receipts screen. every past plan i was in, with its outcome tag
 * (receipt / flake / withdrawn / disputed / unverified) and the
 * others who were there. this is the honest ledger — not a rating,
 * just facts.
 */
export default function ReceiptsScreen() {
  useEffect(() => {
    void refreshAttendance();
  }, []);
  // the ledger is server-side in a live app, so it gets the same pull
  // every other list has — and the same visible answer that it worked.
  const { refreshing, onRefresh } = useRefresher(refreshAttendance);
  const past = useMyPastPlans();
  const receipts = past.filter((p) => p.outcome === 'receipt').length;
  const flakes = past.filter((p) => p.outcome === 'flake').length;

  return (
    <SheetShell title="receipts">
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.flex}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.semantic.color.accent} />
        }
      >
        <Text style={styles.summary}>
          {receipts} {receipts === 1 ? 'plan' : 'plans'} made real{flakes > 0 ? ` · ${flakes} ${flakes === 1 ? 'flake' : 'flakes'}` : ''}
        </Text>

        {past.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyHead}>nothing yet.</Text>
            <Text style={styles.emptySub}>once a plan wraps and both sides say you were there, it lands here.</Text>
          </View>
        ) : (
          <View style={styles.rows}>
            {past.map(({ plan, outcome, others }) => (
              <Row
                key={plan.id}
                title={plan.title}
                sub={`${plan.area} · ${outcomeLabel(outcome)}${others.length > 0 ? ` · with ${others.map(nameFor).join(', ')}` : ''}`}
                left={
                  others[0] ? (
                    <Face
                      photo={facePhotos[others[0]]}
                      initials={(nameFor(others[0]) ?? others[0]).slice(0, 2).toUpperCase()}
                      size={44}
                      label={`photo of ${nameFor(others[0])}`}
                      verified={isVerified(others[0])}
                    />
                  ) : undefined
                }
                right={<Tag label={outcomeTag(outcome)} tone={outcomeTone(outcome)} />}
              />
            ))}
          </View>
        )}

        <SheetNote>receipts are attendance facts, never ratings. we never tell you who reported you present or absent.</SheetNote>
      </ScrollView>

      <View style={styles.actions}>
        <BarButton label="done" variant="onCream" onPress={() => router.back()} />
      </View>
    </SheetShell>
  );
}

function nameFor(personId: string): string {
  return people[personId]?.name ?? personId;
}

function outcomeLabel(outcome: Outcome): string {
  return {
    receipt: 'both sides confirmed',
    flake: 'no-show, confirmed',
    withdrawn: 'you withdrew before the 2h cutoff',
    disputed: 'reports conflicted — no penalty',
    unverified: 'awaiting reports',
  }[outcome];
}

function outcomeTag(outcome: Outcome): string {
  return {
    receipt: 'receipt',
    flake: 'flake',
    withdrawn: 'withdrew',
    disputed: 'disputed',
    unverified: 'pending',
  }[outcome];
}

function outcomeTone(outcome: Outcome): 'hot' | 'ok' | 'dim' {
  return outcome === 'receipt' ? 'ok' : outcome === 'flake' ? 'hot' : 'dim';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { fontFamily: fontFamily.displaySemi, fontSize: 20, letterSpacing: -0.3, color: tokens.semantic.color.ink, marginTop: 4 },
  rows: { marginTop: 18 },
  emptyBlock: { marginTop: 32 },
  emptyHead: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 30, letterSpacing: -0.6, color: tokens.semantic.color.ink },
  emptySub: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  actions: { marginTop: 18, gap: 2 },
});
