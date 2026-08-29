import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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

import { AvatarDot } from './avatar-dot';

/**
 * activity: two sections that sort themselves, no filters.
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

  // pull the interaction state from the server whenever this page opens:
  // requests on your casts, accepts on the ones you sent, and your chats.
  useEffect(() => {
    void refreshInteractions();
    void refreshConversations();
    void refreshAttendance();
  }, []);
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

  const empty = moveItems.length === 0 && !archived;

  return (
    <View style={[styles.page, { width, paddingTop: insets.top + 24 }]}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={styles.title}>
          activity
        </Text>
        <AvatarDot />
      </View>

      {empty && yourCasts.length === 0 ? (
        <View style={styles.emptyMiddle}>
          <Text style={styles.emptyHead}>nothing yet.</Text>
          <Text style={styles.emptySub}>when someone&apos;s in, it lands here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: tokens.component.posterBottomReserve }} showsVerticalScrollIndicator={false}>
          {pending.length > 0 ? (
            <>
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
            </>
          ) : null}

          <Text style={styles.sectionHot}>YOUR MOVE</Text>
          {moveItems.length === 0 && !archived ? (
            <View style={styles.quietBlock}>
              <Text style={styles.quietText}>nothing yet. when someone&apos;s in, it lands here.</Text>
            </View>
          ) : null}
          {archived ? (
            <Row title="archived" sub="tap to undo" onPress={undo} right={<Tag label="undo" tone="dim" />} />
          ) : null}
          {moveItems.map((item) => (
            <Row
              key={item.id}
              title={item.title}
              sub={item.sub}
              left={item.personId ? <Face photo={facePhotos[item.personId]} initials={item.title.slice(0, 2).toUpperCase()} size={44} label={`photo of ${item.title}`} verified={isVerified(item.personId)} /> : undefined}
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

          {joinsISent.length > 0 ? (
            <>
              <Text style={styles.sectionDim}>WAITING ON</Text>
              {joinsISent.map((j) => (
                <Row
                  key={`sent-${j.castId}`}
                  title={`${j.casterName} decides`}
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

          {chats.length > 0 ? (
            <>
              <Text style={styles.sectionDim}>CHATS</Text>
              {chats.map((chat) => (
                <Row
                  key={`chat-${chat.conversationId}`}
                  title={chat.withName}
                  sub={`"${chat.castTitle}" · ${chat.ended ? 'ended' : chat.lastMessage}`}
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
              ))}
            </>
          ) : null}

          <Text style={styles.sectionDim}>YOUR CASTS</Text>
          {yourCasts.map((item) => {
            const isPosted = myCastDetails.some((c) => c.id === item.castId);
            return (
              <Row
                key={item.id}
                title={item.title}
                sub={`${item.sub}${isPosted ? ' · long-press to cancel' : ''}`}
                right={item.tag ? <Tag label={item.tag.label} tone={item.tag.tone} /> : <Tag label="→" tone="line" />}
                onPress={item.castId ? () => router.push(`/cast/${item.castId}`) : () => router.push('/compose')}
                onLongPress={isPosted && item.castId ? () => confirmCancel(item.castId!, item.title) : undefined}
              />
            );
          })}
        </ScrollView>
      )}

      {empty && yourCasts.length === 0 ? (
        <View style={{ paddingBottom: tokens.component.posterBottomReserve }}>
          <BarButton label="cast something" variant="onOrange" onPress={() => router.push('/compose')} />
        </View>
      ) : null}
    </View>
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
  sectionHot: { ...tokens.typography.tagSmall, color: tokens.semantic.color.accent, marginTop: 18, marginBottom: 4 },
  sectionDim: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 30, marginBottom: 4 },
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
