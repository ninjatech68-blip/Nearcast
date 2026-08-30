import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarButton } from '@/design-system/components/button';
import { Face } from '@/design-system/components/face';
import { Row } from '@/design-system/components/row';
import { Tag } from '@/design-system/components/tag';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos, isVerified } from '@/features/casts/faces';
import { type ActivityItem } from '@/features/casts/fixtures';
import {
  cancelCast,
  refreshInteractions,
  useJoinsISent,
  useMyCasts,
  useMyCastDetails,
  usePendingJoinsOnMyCasts,
  withdrawJoin,
} from '@/features/casts/store';
import { refreshAttendance, usePendingReports } from '@/features/attendance/store';
import { refreshConversations, useConversations } from '@/features/chat/chat';

import { Refreshing } from '@/design-system/components/refreshing';
import { useRefresher } from '@/infrastructure/net/use-refresher';

import { AvatarDot } from './avatar-dot';

type Tab = 'chats' | 'yours' | 'requests';

/**
 * activity: three tabs, ordered by how often a person actually needs
 * them rather than by urgency.
 *
 *   chats    — the plans that already matched. the default, because a
 *              live conversation is what people come back for, several
 *              times a day; a request is a once-in-a-while event.
 *   yours    — what you started: casts you posted, requests you sent
 *   requests — people asking to join your casts. last, but it carries a
 *              count, so it is loud when it has something and silent
 *              when it does not.
 *
 * REFLECT PROMPTS ARE NOT IN A TAB. "how did it go?" is rare and
 * time-critical — receipts and flakes cannot settle until it is
 * answered — so it is pinned above the tabs where it cannot be missed.
 * A fourth tab for it would be empty almost always and hiding an
 * obligation the rest of the time.
 *
 * tap a row opens its cast. long-press archives with a 4s undo line.
 */
export function ActivityPage() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const yourCasts = useMyCasts();
  const myCastDetails = useMyCastDetails();
  const pending = usePendingReports('me');
  const joinsISent = useJoinsISent();
  // YOUR MOVE is now COMPUTED from pending joins on your posted casts.
  // fixture yourMove is gone — every row here is a real accept/decline
  // decision the caster owes a joiner.
  const pendingJoins = usePendingJoinsOnMyCasts();
  const chats = useConversations();
  const [dismissed, setDismissed] = useState<readonly string[]>([]);
  const [tab, setTab] = useState<Tab>('chats');

  // pull the interaction state from the server whenever this page opens:
  // requests on your casts, accepts on the ones you sent, and your chats.
  useEffect(() => {
    void refreshInteractions();
    void refreshConversations();
    void refreshAttendance();
  }, []);

  // same reason as the feed: requests and accepts land server-side, so
  // give people a way to pull for them instead of leaving and returning.
  const { refreshing, onRefresh: pullRefresh } = useRefresher(() =>
    Promise.all([refreshInteractions(), refreshConversations(), refreshAttendance()]),
  );
  const moveItems = pendingJoins.filter((item) => !dismissed.includes(item.id));
  const [archived, setArchived] = useState<ActivityItem | null>(null);

  // the undo line clears itself after 4s. that is long enough for the
  // person to swipe back to the feed first, so the timer is tracked and
  // cleared on unmount — otherwise it fires setState on a gone component
  // and keeps the row's closure alive until it does.
  const archiveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (archiveTimer.current) clearTimeout(archiveTimer.current);
    },
    [],
  );

  function archive(item: ActivityItem) {
    haptic('light');
    setDismissed((current) => [...current, item.id]);
    setArchived(item);
    if (archiveTimer.current) clearTimeout(archiveTimer.current);
    archiveTimer.current = setTimeout(
      () => setArchived((held) => (held?.id === item.id ? null : held)),
      4000,
    );
  }

  function undo() {
    if (!archived) return;
    if (archiveTimer.current) clearTimeout(archiveTimer.current);
    setDismissed((current) => current.filter((id) => id !== archived.id));
    setArchived(null);
  }

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

  // the badge is a count of things WAITING ON YOU. chats carry unread,
  // "yours" carries nothing to act on, so neither invents a number.
  const requestCount = moveItems.length;
  const unreadCount = chats.reduce((n, chat) => n + chat.unread, 0);

  // the requests tab can vanish under you when the last request is
  // answered; fall back to chats by DERIVING the shown tab rather than
  // writing state in an effect.
  const shownTab: Tab = tab === 'requests' && requestCount === 0 ? 'chats' : tab;
  const nothingAtAll =
    requestCount === 0 &&
    pending.length === 0 &&
    !archived &&
    chats.length === 0 &&
    joinsISent.length === 0 &&
    yourCasts.length === 0;

  return (
    <View style={[styles.page, { width, paddingTop: insets.top + 24 }]}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={styles.title}>
          activity
        </Text>
        <AvatarDot />
      </View>

      {nothingAtAll ? (
        <>
          <View style={styles.emptyMiddle}>
            <Text style={styles.emptyHead}>nothing yet.</Text>
            <Text style={styles.emptySub}>when someone&apos;s in, it lands here.</Text>
          </View>
          <View style={{ paddingBottom: tokens.component.posterBottomReserve }}>
            <BarButton label="cast something" variant="onOrange" onPress={() => router.push('/compose')} />
          </View>
        </>
      ) : (
        <>
          {/* pinned, above the tabs: nothing else settles until this is
              answered, and it is rare enough that a tab of its own would
              sit empty. */}
          {pending.length > 0 ? (
            <View style={styles.pinned}>
              <Text style={styles.sectionHot}>HOW DID IT GO?</Text>
              {pending.map((plan) => (
                <Row
                  key={plan.id}
                  title={plan.title}
                  sub={`${plan.area} · reflect so receipts and flakes can settle`}
                  right={<Tag label="reflect" tone="hot" />}
                  onPress={() => router.push(`/reflect/${plan.id}`)}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.tabs}>
            <TabButton label="chats" badge={unreadCount} active={shownTab === 'chats'} onPress={() => setTab('chats')} />
            <TabButton label="your plans" badge={0} active={shownTab === 'yours'} onPress={() => setTab('yours')} />
            {/* the requests tab exists only while something is waiting. an
                empty tab is a promise of activity the page cannot keep. */}
            {requestCount > 0 ? (
              <TabButton
                label="requests"
                badge={requestCount}
                active={shownTab === 'requests'}
                onPress={() => setTab('requests')}
              />
            ) : null}
          </View>

          <View style={styles.listWrap}>
          {/* over the list, not over the header: the platform spinner
              sits behind the rows and is easy to miss. */}
          <View style={styles.refreshSlot} pointerEvents="none">
            <Refreshing visible={refreshing} />
          </View>
          <ScrollView
            contentContainerStyle={{ paddingBottom: tokens.component.posterBottomReserve }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={pullRefresh}
                tintColor={tokens.semantic.color.accent}
              />
            }
          >
            {shownTab === 'requests' ? (
              <>
                {moveItems.length > 0 ? <Text style={styles.sectionHot}>ASKED TO JOIN</Text> : null}
                {archived ? (
                  <Row title="archived" sub="tap to undo" onPress={undo} right={<Tag label="undo" tone="dim" />} />
                ) : null}
                {moveItems.map((item) => (
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
                    right={item.tag ? <Tag label={item.tag.label} tone={item.tag.tone} /> : undefined}
                    onPress={
                      // pending join → invite sheet; matched → chat; cast → detail
                      item.tag?.label === 'decide' && item.castId && item.personId
                        ? () => router.push(`/invite/${item.castId}__${item.personId}`)
                        : item.tag?.label === 'matched' && item.castId
                          ? () => router.push(`/chat/${item.castId}`)
                          : item.castId
                            ? () => router.push(`/cast/${item.castId}`)
                            : undefined
                    }
                    onLongPress={() => archive(item)}
                  />
                ))}

                {requestCount === 0 && !archived ? (
                  <View style={styles.quietBlock}>
                    <Text style={styles.quietText}>
                      no one is waiting on you. when someone asks to join a cast, it lands here.
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}

            {shownTab === 'chats' ? (
              chats.length > 0 ? (
                chats.map((chat) => (
                  <Row
                    key={`chat-${chat.conversationId}`}
                    title={chat.withName}
                    sub={
                      chat.planCount > 1
                        ? `${chat.planCount} plans · ${chat.ended ? 'ended' : chat.lastMessage}`
                        : `"${chat.castTitle}" · ${chat.ended ? 'ended' : chat.lastMessage}`
                    }
                    left={
                      <Face
                        photo={facePhotos[chat.withId]}
                        initials={chat.withName.slice(0, 2).toUpperCase()}
                        size={44}
                        label={`photo of ${chat.withName}`}
                        verified={isVerified(chat.withId)}
                      />
                    }
                    right={
                      chat.unread > 0 ? (
                        <Tag label={String(chat.unread)} tone="hot" />
                      ) : (
                        <Tag label="→" tone="line" />
                      )
                    }
                    onPress={() => router.push(`/chat/${chat.conversationId}`)}
                  />
                ))
              ) : (
                <View style={styles.quietBlock}>
                  <Text style={styles.quietText}>no chats yet. one opens the moment a request is accepted.</Text>
                </View>
              )
            ) : null}

            {shownTab === 'yours' ? (
              <>
                {/* plans you are IN: an accepted request is a match, which
                    is a chat. surfacing the PLAN here (not just the person
                    in the chats tab) is the only place the thing you are
                    actually attending is listed as a plan. */}
                {chats.filter((c) => !c.ended).length > 0 ? (
                  <>
                    <Text style={styles.sectionHot}>YOU&apos;RE IN</Text>
                    {chats
                      .filter((c) => !c.ended)
                      .map((chat) => (
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
                          right={<Tag label="open chat" tone="line" />}
                          onPress={() => router.push(`/chat/${chat.conversationId}`)}
                        />
                      ))}
                  </>
                ) : null}

                {joinsISent.length > 0 ? (
                  <>
                    <Text style={styles.sectionDim}>WAITING ON THEM</Text>
                    {joinsISent.map((j) => (
                      <Row
                        key={`sent-${j.castId}`}
                        title={`waiting on ${j.casterName}`}
                        sub={
                          j.note
                            ? `you said “${j.note}” · long-press to withdraw`
                            : `"${j.castTitle}" · long-press to withdraw`
                        }
                        right={<Tag label="pending" tone="dim" />}
                        onPress={() => router.push(`/cast/${j.castId}`)}
                        onLongPress={() => confirmWithdraw(j.castId, j.casterName)}
                      />
                    ))}
                  </>
                ) : null}

                <Text style={styles.sectionDim}>YOUR CASTS</Text>
                {yourCasts.length === 0 ? (
                  <View style={styles.quietBlock}>
                    <Text style={styles.quietText}>you haven&apos;t cast anything yet.</Text>
                  </View>
                ) : null}
                {yourCasts.map((item) => {
                  const isPosted = myCastDetails.some((c) => c.id === item.castId);
                  return (
                    <Row
                      key={item.id}
                      title={item.title}
                      sub={`${item.sub}${isPosted ? ' · long-press to cancel' : ''}`}
                      right={
                        item.tag ? <Tag label={item.tag.label} tone={item.tag.tone} /> : <Tag label="→" tone="line" />
                      }
                      onPress={item.castId ? () => router.push(`/cast/${item.castId}`) : () => router.push('/compose')}
                      onLongPress={isPosted && item.castId ? () => confirmCancel(item.castId!, item.title) : undefined}
                    />
                  );
                })}
              </>
            ) : null}
          </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

/**
 * One tab. The badge is a real count of things waiting on you — it is
 * omitted rather than shown as a zero, because a permanent "0" reads
 * as a failure state.
 */
function TabButton({
  label,
  badge,
  active,
  onPress,
}: {
  label: string;
  badge: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={badge > 0 ? `${label}, ${badge}` : label}
      onPress={() => {
        haptic('selection');
        onPress();
      }}
      style={[styles.tab, active && styles.tabOn]}
      hitSlop={6}
    >
      <Text style={[styles.tabText, active && styles.tabTextOn]}>{label}</Text>
      {badge > 0 ? (
        <View style={[styles.badge, active && styles.badgeOn]}>
          <Text style={[styles.badgeText, active && styles.badgeTextOn]}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.semantic.color.cream, paddingHorizontal: 24 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: tokens.typography.screenTitle.fontSize,
    lineHeight: tokens.typography.screenTitle.lineHeight,
    letterSpacing: tokens.typography.screenTitle.letterSpacing,
    color: tokens.semantic.color.ink,
  },
  listWrap: { flex: 1 },
  refreshSlot: { position: 'absolute', left: 0, right: 0, top: 8, alignItems: 'center', zIndex: 20 },
  pinned: { marginTop: 6 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: tokens.primitive.radius.pill,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
  },
  tabOn: { backgroundColor: tokens.semantic.color.ink, borderColor: tokens.semantic.color.ink },
  tabText: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  tabTextOn: { color: tokens.semantic.color.cream },
  badge: {
    minWidth: 18,
    paddingHorizontal: 5,
    borderRadius: tokens.primitive.radius.pill,
    backgroundColor: tokens.semantic.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOn: { backgroundColor: tokens.semantic.color.accent },
  badgeText: { ...tokens.typography.tagSmall, color: tokens.semantic.color.ink },
  badgeTextOn: { color: tokens.semantic.color.ink },
  sectionHot: { ...tokens.typography.tagSmall, color: tokens.semantic.color.accent, marginTop: 18, marginBottom: 4 },
  sectionDim: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 22, marginBottom: 4 },
  quietBlock: { paddingVertical: 18 },
  quietText: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream },
  emptyMiddle: { flex: 1, justifyContent: 'center' },
  emptyHead: {
    fontFamily: fontFamily.display,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1,
    color: tokens.semantic.color.ink,
  },
  emptySub: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, marginTop: 12 },
});
