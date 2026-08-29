import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Rail, type RailPage } from '@/design-system/components/rail';
import { ActivityPage } from '@/features/casts/activity-page';
import { FeedPage } from '@/features/casts/feed-page';
import { useActivityCount } from '@/features/casts/use-activity-count';
import { onActivityRequested } from '@/features/notifications/routing';

/**
 * the root: a two-page horizontal pager, feed ↔ activity, one rail over both.
 * vertical is always content, horizontal is always pages.
 */
export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const [railOpacity] = useState(() => new Animated.Value(1));
  const [page, setPage] = useState<RailPage>('near');
  const activityCount = useActivityCount();

  function handlePageSettle(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setPage(index === 0 ? 'near' : 'activity');
  }

  function goTo(index: 0 | 1) {
    pagerRef.current?.scrollTo({ x: index * width, animated: true });
    setPage(index === 0 ? 'near' : 'activity');
  }

  // a tapped push is always about a request or an accept, and both live
  // on the activity page — so the pager follows the tap instead of
  // leaving the person on the feed to find it themselves.
  // re-subscribed only when the page width changes, because goTo scrolls
  // by it — an empty dep array would keep scrolling to a stale offset
  // after a rotation, and no array at all would churn the listener set
  // on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => onActivityRequested(() => goTo(1)), [width]);

  function handleFeedScroll(scrolling: boolean) {
    Animated.timing(railOpacity, {
      toValue: scrolling ? 0 : 1,
      duration: scrolling ? 150 : 200,
      useNativeDriver: true,
    }).start();
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handlePageSettle}
        directionalLockEnabled
      >
        <FeedPage onScrollStateChange={handleFeedScroll} />
        <ActivityPage />
      </ScrollView>
      <Rail
        current={page}
        activityCount={activityCount}
        opacity={railOpacity}
        onNear={() => goTo(0)}
        onCast={() => router.push('/compose')}
        onActivity={() => goTo(1)}
      />
    </View>
  );
}
