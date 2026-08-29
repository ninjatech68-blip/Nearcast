import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { Face } from '@/design-system/components/face';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos, isVerified } from '@/features/casts/faces';
import { casters } from '@/features/casts/fixtures';
import { acceptJoin, capacityFor, declineJoin, getCast, getPendingJoin } from '@/features/casts/store';
import { conversationIdFor } from '@/features/chat/chat';
import { usePublicProfile } from '@/features/me/remote-profile';
import { people } from '@/features/trust/circles';
import { submit } from '@/infrastructure/net/submit';

/**
 * the invite sheet: shown to the caster when someone has asked to
 * join. accept → they enter the plan and the chat opens, which is
 * where the details get settled. decline → the request vanishes,
 * silent to the joiner (product law: no reason given, no notification).
 *
 * routed as /invite/[key] where key = "castId__personId" so a single
 * dynamic file handles every (cast, joiner) pair.
 */
export default function InviteScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const [castId, personId] = (key ?? '').split('__');

  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cast = castId ? getCast(castId) : undefined;
  const join = castId && personId ? getPendingJoin(castId, personId) : undefined;

  // The joiner's name comes off the REQUEST first. `people` is the
  // fixture roster keyed by short ids, so a real user id missed it
  // entirely and the sheet greeted the caster with a raw uuid — as did
  // the avatar initials, and the accept button.
  const live = usePublicProfile(personId);
  const local = people[personId];
  const person = {
    id: personId,
    name: firstNonBlank(join?.displayName, live?.firstName, local?.name) ?? 'someone',
    area: live?.area ?? local?.area ?? '',
  };
  const caster = casters.find((c) => c.id === personId);
  // what we can honestly say about them: the server's trust phrase and
  // receipt count in a live app, the fixture roster's line offline,
  // and nothing at all when neither knows.
  const trustLine = live?.trustPhrase ?? caster?.trustLine ?? null;
  const receiptsLine = live ? `${live.receipts} ${live.receipts === 1 ? 'plan' : 'plans'} made real` : null;
  const meta = [person.area || null, trustLine, receiptsLine, join?.sentAgo ?? null]
    .filter(Boolean)
    .join(' · ');

  if (!cast || !join) {
    return (
      <SheetShell title="not around.">
        <Text style={styles.goneSub}>this request is no longer pending.</Text>
        <View style={styles.actions}>
          <BarButton label="back" variant="onCream" onPress={() => router.back()} />
        </View>
      </SheetShell>
    );
  }

  // slots are hidden everywhere, so only a cast that genuinely carries
  // a cap (one the backend will enforce) can ever refuse a yes here.
  const capacity = capacityFor(cast);

  async function accept() {
    if (capacity.full) {
      Alert.alert('already full', 'this plan has everyone it can take.', [{ text: 'ok' }]);
      return;
    }
    if (!cast) return;
    setAccepting(true);
    setError(null);
    const result = await submit(() => acceptJoin(castId, personId));
    setAccepting(false);
    if (!result.ok) {
      // the request stays pending — better they ask again than that we
      // tell someone they're in when the caster never confirmed.
      haptic('warning');
      setError(
        result.reason === 'offline'
          ? "you're offline. they're still waiting — try again when you're back."
          : "that didn't go through. they're still waiting — tap to try again.",
      );
      return;
    }
    haptic('success');
    // land the caster in the chat that the accept just opened. backend
    // mode keys chat by conversation id; fixtures key it by cast id, and
    // conversationIdFor returns the cast id there so both paths work.
    const conversationId = await conversationIdFor(castId, personId);
    router.replace(`/chat/${conversationId ?? cast.id}`);
  }

  function decline() {
    Alert.alert(`decline ${person.name}?`, `they won't be told why. they see nothing change.`, [
      { text: 'never mind' },
      {
        text: 'decline',
        style: 'destructive',
        onPress: () => {
          haptic('light');
          void declineJoin(castId, personId);
          router.back();
        },
      },
    ]);
  }

  return (
    <SheetShell
      title={`${person.name} asked to join`}
      accessory={
        <Face
          photo={facePhotos[personId]}
          initials={person.name.slice(0, 2).toUpperCase()}
          size={64}
          label={`photo of ${person.name}`}
          verified={isVerified(personId)}
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* WHAT THEY SAID comes first. It is the only thing the caster
            has to decide on, and it used to sit below a meta line and a
            section label where testers missed it. */}
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>{join.note}</Text>
          <Text style={styles.noteWho}>— {person.name}</Text>
        </View>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}

        <Text style={styles.section}>YOUR PLAN</Text>
        <Text style={styles.planTitle}>{cast.text}</Text>
        <Text style={styles.planMeta}>
          {cast.area} · {cast.expiry}
        </Text>

        {caster ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`about ${caster.name}`}
            onPress={() => router.push(`/caster/${caster.id}`)}
            style={styles.aboutRow}
          >
            <Text style={styles.aboutText}>{caster.receipts.line} ›</Text>
          </Pressable>
        ) : null}

        <SheetNote>{`accepting opens a chat with ${person.name} — that is where you settle where and when. declining is silent — they see nothing change.`}</SheetNote>
      </ScrollView>

      <View style={styles.actions}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <BarButton
          label={error ? 'try again' : `accept ${person.name}`}
          variant="onOrange"
          onPress={accept}
          disabled={capacity.full || accepting}
          loading={accepting}
          loadingLabel="accepting…"
        />
        <QuietAction label="decline" color={tokens.semantic.color.ink} onPress={decline} />
      </View>
    </SheetShell>
  );
}

/** the first of these that is actually a name, not '' or undefined. */
function firstNonBlank(...values: (string | undefined | null)[]): string | undefined {
  for (const value of values) {
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  meta: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  noteWho: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  section: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 22, marginBottom: 6 },
  noteCard: {
    padding: 16,
    marginTop: 16,
    borderRadius: tokens.primitive.radius.control,
    borderLeftWidth: 3,
    borderLeftColor: tokens.semantic.color.accent,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
  },
  noteText: { fontFamily: fontFamily.text, fontSize: 18, lineHeight: 26, color: tokens.semantic.color.ink },
  planTitle: { fontFamily: fontFamily.displaySemi, fontSize: 20, letterSpacing: -0.3, color: tokens.semantic.color.ink },
  planMeta: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 6 },
  aboutRow: { minHeight: 44, justifyContent: 'center', marginTop: 12 },
  aboutText: { fontFamily: fontFamily.displaySemi, fontSize: 15, color: tokens.semantic.color.accent },
  error: { ...tokens.typography.metaSmall, color: tokens.semantic.color.accent, marginBottom: 10, textAlign: 'center' },
  goneSub: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  actions: { marginTop: 18, gap: 2 },
});
