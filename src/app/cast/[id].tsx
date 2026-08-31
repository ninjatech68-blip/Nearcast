import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { SignalBars } from '@/design-system/components/bars';
import { BarButton, QuietAction } from '@/design-system/components/button';
import { Face } from '@/design-system/components/face';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos, isVerified } from '@/features/casts/faces';
import { cancelCast, getCast, useJoinsISent, withdrawJoin } from '@/features/casts/store';
import { shareMessageFor } from '@/features/sharing/share-link';
import { shareLinkForSlug } from '@/features/sharing/remote-share';

/**
 * the detail sheet. receipts show at the decision moment:
 * attendance facts, never a rating.
 *
 * THE PLAN IS THE SUBJECT. This sheet used to open with the caster's
 * name as its title and a full-width pressable block of their line and
 * signal bars underneath, so tapping the cast landed people on a
 * profile they had not asked for. The caster is now a single compact
 * capsule, and that capsule is the ONLY thing here that navigates to
 * their profile — the same rule the feed poster follows.
 */
export default function CastDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cast = getCast(id ?? '');
  // A cast you have ALREADY asked to join must not offer the ask again.
  // It did: opening one from "waiting on" put the note sheet back up, so
  // the same request could be sent twice and the screen read as though
  // nothing had happened.
  const sent = useJoinsISent();
  const asked = sent.find((join) => join.castId === (id ?? ''));

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
    <SheetShell title={cast.text}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <Text style={styles.reach}>{reachLine(cast)}</Text>

        {/* the one route to the profile. everything else on this sheet
            is about the plan, and tapping it stays on the plan. YOUR OWN
            cast has no caster to open — tapping through went to a
            /caster/me that does not exist and landed on "not around" —
            so the capsule is simply not shown on a cast you posted. */}
        {cast.byId !== 'me' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`about ${cast.by}`}
            onPress={() => router.push(`/caster/${cast.byId}`)}
            hitSlop={6}
            style={styles.casterPill}
          >
            <Face
              photo={facePhotos[cast.byId]}
              initials={cast.by.slice(0, 2).toUpperCase()}
              size={28}
              label=""
              verified={isVerified(cast.byId)}
            />
            <Text style={styles.casterText} numberOfLines={1}>
              {cast.by} ›
            </Text>
            {cast.receipts.line ? (
              <>
                <SignalBars lit={cast.receipts.lit} size="small" trackColor={tokens.semantic.color.ink} />
                <Text style={styles.receiptsLine} numberOfLines={1}>
                  {cast.receipts.line}
                </Text>
              </>
            ) : null}
          </Pressable>
        ) : (
          <Text style={styles.yoursNote}>you cast this</Text>
        )}

        {cast.body !== cast.text ? <Text style={styles.body}>{cast.body}</Text> : null}
        {cast.why ? <Text style={styles.why}>why you: {cast.why}</Text> : null}
        <SheetNote>casts show the neighbourhood, never an exact spot. you sort out exactly where in chat. it&apos;s in-app, nobody swaps numbers.</SheetNote>
      </ScrollView>
      <View style={styles.actions}>{renderActions()}</View>
    </SheetShell>
  );

  function renderActions() {
    if (!cast) return null;
    if (cast.byId === 'me') {
      // MUST-020: every published cast has its own link, and this is where
      // the caster gets it. Offered only when the public link is on, so the
      // action never hands out a link nobody can open.
      const canShare = cast.shareSlug !== undefined && cast.shareLinkEnabled !== false;

      return (
        <>
          {canShare ? (
            <BarButton label="share this cast" variant="onOrange" onPress={openShare} />
          ) : null}
          <BarButton label="back" variant="onCream" onPress={() => router.back()} />
          <QuietAction label="cancel this cast" color={tokens.semantic.color.ink} onPress={openCancel} />
        </>
      );
    }
    if (asked) {
      return (
        <>
          <Text style={styles.askedLine}>{`you asked to join. ${cast.by.toLowerCase()} decides. you'll hear in activity.`}</Text>
          <BarButton label="back" variant="onCream" onPress={() => router.back()} />
          <QuietAction label="withdraw request" color={tokens.semantic.color.ink} onPress={openWithdraw} />
        </>
      );
    }
    return (
      <>
        <BarButton label="ask to join" variant="onOrange" onPress={() => router.push(`/join/${cast.id}`)} />
        <QuietAction label="skip" color={tokens.semantic.color.ink} onPress={() => router.back()} />
      </>
    );
  }

  function openWithdraw() {
    if (!cast) return;
    Alert.alert(`withdraw from ${cast.by}'s plan?`, "they see nothing change. they'll never know you'd asked.", [
      { text: 'never mind' },
      {
        text: 'withdraw',
        style: 'destructive',
        onPress: () => {
          haptic('light');
          void withdrawJoin(cast.id);
          router.back();
        },
      },
    ]);
  }

  /**
   * Hand the caster their own link to paste wherever they like.
   *
   * The sheet is the system one, so Nearcast never learns where the link
   * went: sharing into a WhatsApp group must not tell us the group exists,
   * which is the same rule that keeps the origin circle private.
   */
  async function openShare() {
    if (!cast?.shareSlug) return;

    haptic('selection');
    const link = shareLinkForSlug(cast.shareSlug);

    try {
      await Share.share({ message: shareMessageFor(cast.body, link), url: link.url });
    } catch {
      // Dismissing the share sheet throws on iOS. Nothing to report.
    }
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
  // the distance when the server measured one, the place name when it
  // could not — never both, and never a guessed number.
  return `${cast.distance ?? cast.area} · ${cast.expiry}`;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  casterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingLeft: 4,
    paddingRight: 12,
    marginTop: 14,
    borderRadius: tokens.primitive.radius.pill,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
  },
  casterText: { fontFamily: fontFamily.displaySemi, fontSize: 15, color: tokens.semantic.color.ink, flexShrink: 1 },
  receiptsLine: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, flexShrink: 1 },
  why: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 14 },
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
    marginTop: 10,
  },
  goneSub: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  askedLine: { ...tokens.typography.metaSmall, color: tokens.semantic.color.accent, marginBottom: 10 },
  yoursNote: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 14 },
  actions: { marginTop: 18, gap: 2 },
});
