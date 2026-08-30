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

import { Dock, DOCK_PAGES, type DockPage } from '@/design-system/components/dock';
import { category as categoryTokens, tokens, type Category } from '@/design-system/tokens';
import { AlertsPage, useNeedsYouCount } from '@/features/casts/alerts-page';
import { FeedPage } from '@/features/casts/feed-page';
import { ChatsPage } from '@/features/chat/chats-page';
import { useConversations } from '@/features/chat/chat';
import { initialsFor } from '@/features/me/initials';
import { useMe, useMyPhoto } from '@/features/me/me-store';
import { YouPage } from '@/features/me/you-page';
import { onAlertsRequested } from '@/features/notifications/routing';

/**
 * The root: four horizontal pages under one dock.
 *
 * Vertical is always content, horizontal is always pages — and both the
 * swipe and the dock move through the same four, so neither is the only
 * way to get anywhere.
 *
 * THE DOCK NEVER FADES. Its predecessor animated to `opacity: 0` on feed
 * scroll and only `onMomentumScrollEnd` brought it back, so any drag
 * released without velocity left it invisible for good — and an
 * opacity-0 view in React Native still receives touches, so the band
 * went on swallowing every tap aimed at the poster underneath. That was
 * the "the bar is not getting registered" bug, and there is now no
 * opacity to get stuck at.
 *
 * COLOUR follows the poster. The dock has no surface of its own, so its
 * marks take the visible cast's declared foreground; off the feed the
 * ground is cream and they are ink. Mid-swipe the screen is part poster
 * and part cream and no single colour is right for both halves, so the
 * horizontal offset cross-fades two copies — at every point in the
 * transition one of them is legible against whatever is actually behind
 * it.
 */
export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  // useState rather than useRef: the value is read during render to
  // build the dock's cross-fade, and a ref read in render is exactly the
  // stale-value hazard the lint rule is there to catch.
  const [scrollX] = useState(() => new Animated.Value(0));
  const [page, setPage] = useState<DockPage>('near');
  const [fieldCategory, setFieldCategory] = useState<Category | null>(null);

  const me = useMe();
  const photoUri = useMyPhoto();
  const chats = useConversations();
  const needsYou = useNeedsYouCount();
  // one badge, one meaning: conversations carrying unread messages, not
  // a total of messages and not anything already read.
  const unreadChats = chats.filter((chat) => chat.unread > 0).length;

  // an empty or failed feed renders on cream, so ink is the honest
  // default until a poster is actually on screen.
  const fieldFg = fieldCategory ? categoryTokens[fieldCategory].fg : tokens.semantic.color.ink;

  // 0 while the feed fills the screen, 1 once any cream page does.
  const blend = useMemo(
    () => scrollX.interpolate({ inputRange: [0, width], outputRange: [0, 1], extrapolate: 'clamp' }),
    [scrollX, width],
  );
  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true }),
    [scrollX],
  );

  function handlePageSettle(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setPage(DOCK_PAGES[index] ?? 'near');
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
  useEffect(() => onAlertsRequested(() => goTo('alerts')), [width]);

  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView
        ref={pagerRef as never}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handlePageSettle}
        onScroll={onScroll}
        scrollEventThrottle={16}
        directionalLockEnabled
      >
        <FeedPage onCategoryChange={setFieldCategory} />
        <ChatsPage />
        <AlertsPage />
        <YouPage />
      </Animated.ScrollView>
      <Dock
        current={page}
        fieldFg={fieldFg}
        blend={blend}
        chatCount={unreadChats}
        alertCount={needsYou}
        photo={photoUri ? { uri: photoUri } : undefined}
        initials={initialsFor(me.name)}
        onGo={goTo}
        onCast={() => router.push('/compose')}
      />
    </View>
  );
}
