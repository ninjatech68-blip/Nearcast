import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Face } from '@/design-system/components/face';
import { GroupLabel, Page, Quiet } from '@/design-system/components/page';
import { Row } from '@/design-system/components/row';
import { Tag } from '@/design-system/components/tag';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { refreshAttendance, usePendingReports } from '@/features/attendance/store';
import { alertTabs, type AlertCounts, type AlertTabId } from '@/features/casts/domain/alert-tabs';
import { facePhotos, isVerified } from '@/features/casts/faces';
import {
  cancelCast,
  refreshInteractions,
  useJoinsISent,
  useMyCastDetails,
  useMyCasts,
  usePendingJoinsOnMyCasts,
  withdrawJoin,
} from '@/features/casts/store';
import { refreshConversations, useConversations } from '@/features/chat/chat';
import { useRefresher } from '@/infrastructure/net/use-refresher';

const LABEL: Record<AlertTabId, string> = {
  needs: 'needs you',
  waiting: 'waiting',
  plans: 'your plans',
};

/**
 * Alerts: everything about your plans that is not a conversation.
 *
 * Three groups, and a group with no rows is not rendered at all — no
 * empty tab, no zero, no promise of activity the page cannot keep. The
 * rules that stop a disappearing tab becoming a moving target live in
 * domain/alert-tabs.ts, tested separately, because a screen is a bad
 * place to keep a rule honest.
 *
 * WHAT GOES WHERE is decided by what each row asks of you:
 *
 *   needs you  — join requests on your casts, and plans still waiting
 *                for "how did it go?". Decisions you owe. The only
 *                group that feeds the dock's badge.
 *   waiting    — requests you sent that nobody has answered yet.
 *   your plans — what you cast and what you joined, in one list, each
 *                row tagged. They answer the same question — what am I
 *                part of? — and splitting them made you look twice.
 */
export function AlertsPage() {
  const pendingJoins = usePendingJoinsOnMyCasts();
  const reflect = usePendingReports('me');
  const joinsISent = useJoinsISent();
  const chats = useConversations();
  const myCasts = useMyCasts();
  const myCastDetails = useMyCastDetails();
  const [selected, setSelected] = useState<AlertTabId>('needs');

  // only attendance: the shell already polls interactions and
  // conversations while signed in, and fires once immediately. this page
  // and chats both mount at launch inside the pager, so repeating those
  // two here made three identical requests of the same cold start.
  useEffect(() => {
    void refreshAttendance();
  }, []);

  const { refreshing, onRefresh } = useRefresher(() =>
    Promise.all([refreshInteractions(), refreshConversations(), refreshAttendance()]),
  );

  /**
   * One row per plan.
   *
   * A cast you posted that somebody joined was appearing twice: once
   * from myCasts as "you cast", and again inside the conversation row
   * for the same plan. The conversation belongs to whoever did NOT cast
   * it, so a chat whose plan is already in your own casts is dropped
   * here. Ended chats are dropped altogether — they have a home on the
   * chats page, with their own tag, and repeating them under a heading
   * called news is what made that heading meaningless.
   */
  const mine = useMemo(() => new Set(myCasts.map((item) => item.castId)), [myCasts]);
  const joined = useMemo(() => chats.filter((c) => !c.ended && !mine.has(c.castId)), [chats, mine]);

  const counts: AlertCounts = {
    needs: pendingJoins.length + reflect.length,
    waiting: joinsISent.length,
    plans: joined.length + myCasts.length,
  };
  const { visible, shown, showStrip } = alertTabs(counts, selected);

  function confirmWithdraw(castId: string, casterName: string) {
    Alert.alert(`withdraw from ${casterName}'s plan?`, "they see nothing change. they'll never know you'd asked.", [
      { text: 'never mind' },
      {
        text: 'withdraw',
        style: 'destructive',
        onPress: () => {
          haptic('light');
          void withdrawJoin(castId);
        },
      },
    ]);
  }

  function confirmCancel(castId: string, castTitle: string) {
    Alert.alert(`cancel "${castTitle}"?`, 'the cast comes down. anyone matched will see it end.', [
      { text: 'never mind' },
      {
        text: 'cancel it',
        style: 'destructive',
        onPress: () => {
          haptic('light');
          cancelCast(castId);
        },
      },
    ]);
  }

  return (
    <Page title="alerts" refreshing={refreshing} onRefresh={onRefresh} refreshLabel="looking for news…">
      {shown === null ? (
        <Quiet
          head="quiet."
          sub="nothing is waiting on you. when someone asks to join a cast, or a plan needs an answer, it lands here."
        />
      ) : (
        <>
          {/* below two populated groups there is no strip: a lone tab is
              a control with no alternative, so the group name carries it
              as a plain heading instead. */}
          {showStrip ? (
            <View style={styles.strip}>
              {visible.map((id) => (
                <Pressable
                  key={id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: shown === id }}
                  accessibilityLabel={`${LABEL[id]}, ${counts[id]}`}
                  // the pill is 38 pt to match the category picker; the
                  // slop is what actually clears the 44 pt floor.
                  hitSlop={{ top: 6, bottom: 6 }}
                  onPress={() => {
                    haptic('selection');
                    setSelected(id);
                  }}
                  style={[styles.tab, shown === id ? styles.tabOn : null]}
                >
                  <Text style={[styles.tabLabel, shown === id ? styles.tabLabelOn : null]}>{LABEL[id]}</Text>
                  {/* a real count in every label is what buys back the
                      scent a tab normally costs. */}
                  <View style={[styles.tabCount, shown === id ? styles.tabCountOn : null]}>
                    <Text style={[styles.tabCountText, shown === id ? styles.tabCountTextOn : null]}>{counts[id]}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            // a real count rides the heading too, so rule 4 holds whether
            // or not the strip is showing.
            <GroupLabel label={LABEL[shown]} count={counts[shown]} />
          )}

          {shown === 'needs' ? (
            <>
              {reflect.map((plan) => (
                <Row
                  key={`reflect-${plan.id}`}
                  title={plan.title}
                  sub={`${plan.area} · how did it go? receipts wait on this`}
                  right={<Tag label="answer" tone="hot" />}
                  onPress={() => router.push(`/reflect/${plan.id}`)}
                />
              ))}
              {pendingJoins.map((item) => (
                <Row
                  key={item.id}
                  title={item.title}
                  sub={item.sub}
                  left={
                    item.personId ? (
                      <Face
                        photo={facePhotos[item.personId]}
                        initials={item.title.slice(0, 2).toUpperCase()}
                        size={44}
                        label={`photo of ${item.title}`}
                        verified={isVerified(item.personId)}
                      />
                    ) : undefined
                  }
                  right={<Tag label="decide" tone="hot" />}
                  onPress={
                    item.castId && item.personId
                      ? () => router.push(`/invite/${item.castId}__${item.personId}`)
                      : undefined
                  }
                />
              ))}
            </>
          ) : null}

          {shown === 'waiting' ? (
            <>
              {joinsISent.map((j) => (
                <Row
                  key={`sent-${j.castId}`}
                  title={`waiting on ${j.casterName}`}
                  sub={
                    j.note ? `you said “${j.note}” · long-press to withdraw` : `"${j.castTitle}" · long-press to withdraw`
                  }
                  right={<Tag label="pending" tone="dim" />}
                  onPress={() => router.push(`/cast/${j.castId}`)}
                  onLongPress={() => confirmWithdraw(j.castId, j.casterName)}
                />
              ))}
            </>
          ) : null}

          {shown === 'plans' ? (
            <>
              {myCasts.map((item) => {
                const castId = item.castId;
                const posted = !!castId && myCastDetails.some((c) => c.id === castId);
                return (
                  <Row
                    key={item.id}
                    title={item.title}
                    sub={`${item.sub}${posted ? ' · long-press to cancel' : ''}`}
                    right={<Tag label="you cast" tone="line" />}
                    onPress={castId ? () => router.push(`/plan/${castId}`) : undefined}
                    onLongPress={posted && castId ? () => confirmCancel(castId, item.title) : undefined}
                  />
                );
              })}
              {joined.map((chat) => (
                <Row
                  key={`in-${chat.conversationId}`}
                  title={chat.planCount > 1 ? `${chat.planCount} plans with ${chat.withName}` : chat.castTitle}
                  sub={chat.planCount > 1 ? chat.castTitle : `with ${chat.withName}`}
                  left={
                    <Face
                      photo={facePhotos[chat.withId]}
                      initials={chat.withName.slice(0, 2).toUpperCase()}
                      size={44}
                      label={`photo of ${chat.withName}`}
                      verified={isVerified(chat.withId)}
                    />
                  }
                  right={<Tag label="you joined" tone="line" />}
                  onPress={() => router.push(`/plan/${chat.castId}?chat=${chat.conversationId}`)}
                />
              ))}
            </>
          ) : null}
        </>
      )}
    </Page>
  );
}

/** the count the dock badges: decisions you owe, and nothing else. */
export function useNeedsYouCount(): number {
  const pendingJoins = usePendingJoinsOnMyCasts();
  const reflect = usePendingReports('me');
  return pendingJoins.length + reflect.length;
}


const styles = StyleSheet.create({
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, marginBottom: 4 },
  // the same pill the category picker uses, so a selected tab and a
  // selected category are visibly the same kind of thing.
  tab: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: tokens.primitive.radius.pill,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabOn: { backgroundColor: tokens.semantic.color.ink, borderColor: tokens.semantic.color.ink },
  tabLabel: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream, textTransform: 'uppercase' },
  tabLabelOn: { color: tokens.semantic.color.cream },
  tabCount: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: tokens.semantic.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountOn: { backgroundColor: tokens.semantic.color.accent },
  tabCountText: { fontFamily: fontFamily.monoSemi, fontSize: 10, lineHeight: 13, color: tokens.semantic.color.ink },
  tabCountTextOn: { color: tokens.semantic.color.ink },
});
