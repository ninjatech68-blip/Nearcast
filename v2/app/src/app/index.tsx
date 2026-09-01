import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { CastButton } from '@/design-system/components/cast-button';
import { Dock, DOCK_PAGES, type DockPage } from '@/design-system/components/dock';
import { category as categoryTokens, tokens, type Category } from '@/design-system/tokens';
import { useNeedsYouCount } from '@/features/casts/alerts-page';
import { FeedPage } from '@/features/casts/feed-page';
import { InboxPage } from '@/features/inbox/inbox-page';
import { useConversations } from '@/features/chat/chat';
import { initialsFor } from '@/features/me/initials';
import { useMe, useMyPhoto } from '@/features/me/me-store';
import { YouPage } from '@/features/me/you-page';
import { onAlertsRequested } from '@/features/notifications/routing';

/**
 * The root: three horizontal pages, a dock, and a cast button.
 *
 * Vertical is always content, horizontal is always pages -- and both
 * the swipe and the dock move through the same three, so neither is the
 * only way to get anywhere.
 *
 * Chats and alerts became one Inbox. That is what makes three
 * destinations enough, and it is the right merge on its own terms: both
 * answer "what needs me?", and someone checking one is already checking
 * the other. Casting left the dock for the top right, which is what
 * lets three columns balance with nothing to arrange around.
 *
 * THE DOCK COLLAPSES, IT DOES NOT FADE. Its ancestor animated to
 * `opacity: 0` on feed scroll and only `onMomentumScrollEnd` brought it
 * back, so any drag released without velocity left it invisible for
 * good -- and an opacity-0 view in React Native still receives touches,
 * so the band went on swallowing every tap aimed at the poster
 * underneath. Collapsed here means a smaller mark in the bottom left:
 * always visible, always a control. There is no state in which
 * something invisible is taking taps.
 *
 * COLOUR follows the poster. Glass refracts the category field rather
 * than covering it, so the marks still take the visible cast's declared
 * foreground; off the feed the ground is cream and they are ink.
 */
export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  // useState rather than useRef: the value is read during render to
  // build the dock's cross-fade, and a ref read in render is exactly the
  // stale-value hazard the lint rule is there to catch.
  const [scrollX] = useState(() => new Animated.Value(0));
  // The pager position as a fractional page index (0..N-1), driven from the
  // scroll listener. The dock's selection lens follows this, so it slides
  // with a swipe instead of snapping to the next slot at the halfway point.
  // Separate from scrollX because scrollX is native-driven and the lens's
  // `left` is a layout prop, which the native driver cannot carry.
  const [scrollPos] = useState(() => new Animated.Value(0));
  const [page, setPage] = useState<DockPage>('near');
  const [fieldCategory, setFieldCategory] = useState<Category | null>(null);

  const me = useMe();
  const photoUri = useMyPhoto();
  const chats = useConversations();
  const needsYou = useNeedsYouCount();
  // one badge, one meaning: conversations carrying unread messages, not
  // a total of messages and not anything already read. Chats and alerts
  // share a destination now, so they share a count -- two badges on one
  // slot would be a number nobody could act on.
  const unreadChats = chats.filter((chat) => chat.unread > 0).length;
  const inboxCount = unreadChats + needsYou;

  // an empty or failed feed renders on cream, so ink is the honest
  // default until a poster is actually on screen.
  // Only while the feed is the page on screen. The category used to
  // persist after you swiped away, so a dark poster's cream foreground
  // followed you onto the cream inbox and vanished into it.
  const onFeed = page === 'near';
  const fieldFg = onFeed && fieldCategory ? categoryTokens[fieldCategory].fg : tokens.semantic.color.ink;

  // The dock stays put now: it no longer collapses while you read the
  // feed. It is only ever the full pill, changing when you drag or tap it,
  // never on scroll. `collapse` is kept as a constant 0 because the dock
  // still interpolates it -- 0 is the full-width state, the only one left.
  const [collapse] = useState(() => new Animated.Value(0));

  // The dock used to light up only on onMomentumScrollEnd, so it could
  // never do anything but lag the swipe: the pages move continuously and
  // the marks waited for the gesture to finish. Reading the offset means
  // selection lands the moment a page passes the halfway point, which is
  // when a person has already decided. The listener rides along with the
  // native-driven value rather than replacing it.
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
        listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const offset = event.nativeEvent.contentOffset.x / width;
          // the continuous position the lens rides, updated every frame
          // (scrollEventThrottle 16) so the lens tracks the swipe.
          scrollPos.setValue(offset);
          const index = Math.round(offset);
          const next = DOCK_PAGES[index];
          if (next && next !== page) setPage(next);
        },
      }),
    [scrollX, scrollPos, width, page],
  );

  /**
   * A thumb dragging along the dock, as a fractional page position.
   *
   * While the thumb is down the pager is moved without animation, so the
   * pages track the finger instead of chasing it. On release it animates
   * to the whole page that was landed on -- `goTo` from the dock's own
   * onGo does that, so this only has to stop driving.
   */
  function scrub(position: number, settled: boolean) {
    if (settled) return;
    pagerRef.current?.scrollTo({ x: position * width, animated: false });
  }

  function goTo(target: DockPage) {
    const index = DOCK_PAGES.indexOf(target);
    if (index < 0) return;
    pagerRef.current?.scrollTo({ x: index * width, animated: true });
    setPage(target);
  }

  // a tapped push is always about a request or an accept, and both land
  // in alerts — so the pager follows the tap instead of leaving the
  // person on the feed to find it themselves. re-subscribed when the
  // page width changes, because goTo scrolls by it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => onAlertsRequested(() => goTo('inbox')), [width]);

  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView
        ref={pagerRef as never}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        directionalLockEnabled
      >
        <FeedPage onCategoryChange={setFieldCategory} />
        <InboxPage chatCount={unreadChats} activityCount={needsYou} />
        <YouPage />
      </Animated.ScrollView>
      {/* not on `you`: the profile avatar owns that corner and the two
          were overlapping. Reddit puts + on every page because none of
          its pages has a top-right avatar. */}
      {page === 'you' ? null : <CastButton fieldFg={fieldFg} onPress={() => router.push('/compose')} />}
      <Dock
        current={page}
        fieldFg={fieldFg}
        collapse={collapse}
        scrollPos={scrollPos}
        inboxCount={inboxCount}
        photo={photoUri ? { uri: photoUri } : undefined}
        initials={initialsFor(me.name)}
        onGo={goTo}
        onScrub={scrub}
      />
    </View>
  );
}
