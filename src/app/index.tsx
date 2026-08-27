import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Rail, type RailPage } from '@/design-system/components/rail';
import { ActivityPage } from '@/features/casts/activity-page';
import { FeedPage } from '@/features/casts/feed-page';

/**
 * the root: a two-page horizontal pager, feed ↔ activity, one rail over both.
 * vertical is always content, horizontal is always pages.
 */
export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const [railOpacity] = useState(() => new Animated.Value(1));
  const [page, setPage] = useState<RailPage>('near');

  function handlePageSettle(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setPage(index === 0 ? 'near' : 'activity');
  }

  function goTo(index: 0 | 1) {
    pagerRef.current?.scrollTo({ x: index * width, animated: true });
    setPage(index === 0 ? 'near' : 'activity');
  }

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
        opacity={railOpacity}
        onNear={() => goTo(0)}
        onCast={() => router.push('/compose')}
        onActivity={() => goTo(1)}
      />
    </View>
  );
}
