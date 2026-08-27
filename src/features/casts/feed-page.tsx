import { router } from 'expo-router';
import { useState } from 'react';
import { Animated, FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { Poster } from '@/design-system/components/poster';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens, verbForeground } from '@/design-system/tokens';
import { type CastDetail } from '@/features/casts/fixtures';
import { skipCast, useFeedCasts } from '@/features/casts/store';

import { AvatarDot } from './avatar-dot';

/**
 * the feed: one cast per viewport, vertical snap. scrolling past a cast
 * is the passive skip; the skip button means "less like this" and plays
 * the exit-left animation. when nearby casts run out, the feed says so.
 */
export function FeedPage({
  onScrollStateChange,
}: {
  onScrollStateChange?: (scrolling: boolean) => void;
}) {
  const { height, width } = useWindowDimensions();
  const visible = useFeedCasts();

  function skip(id: string) {
    haptic('light');
    skipCast(id);
  }

  if (visible.length === 0) {
    return <FeedEmpty />;
  }

  return (
    <FlatList
      data={visible}
      keyExtractor={(cast) => cast.id}
      renderItem={({ item }) => (
        <View style={{ height, width }}>
          <SkippablePoster cast={item} onSkip={() => skip(item.id)} />
        </View>
      )}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
      onScrollBeginDrag={() => onScrollStateChange?.(true)}
      onMomentumScrollEnd={() => onScrollStateChange?.(false)}
      windowSize={3}
      style={{ width }}
    />
  );
}

function SkippablePoster({ cast, onSkip }: { cast: CastDetail; onSkip: () => void }) {
  const { width } = useWindowDimensions();
  const [exit] = useState(() => new Animated.Value(0));

  function playSkip() {
    Animated.timing(exit, { toValue: 1, duration: 240, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onSkip();
    });
  }

  const translateX = exit.interpolate({ inputRange: [0, 1], outputRange: [0, -width] });
  const rotate = exit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-2deg'] });

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateX }, { rotate }] }}>
      <Poster
        cast={cast}
        topRight={<AvatarDot onColored verb={cast.verb} />}
        onOpen={() => router.push(`/cast/${cast.id}`)}
        casterLine={`${cast.by.toLowerCase()} · ${cast.receipts.line.split(' · ')[0]}`}
        onOpenCaster={() => router.push(`/caster/${cast.byId}`)}
      >
        <BarButton
          label="I'm in"
          variant={cast.verb === 'got' ? 'onCream' : 'onInk'}
          onPress={() => router.push(`/join/${cast.id}`)}
        />
        <QuietAction label="skip" color={verbForeground[cast.verb]} onPress={playSkip} />
      </Poster>
    </Animated.View>
  );
}

function FeedEmpty() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.empty, { paddingTop: insets.top + 24 }]}>
      <View style={styles.emptyTop}>
        <Text style={styles.wordmark}>NEARCAST</Text>
        <AvatarDot />
      </View>
      <View style={styles.emptyMiddle}>
        <Text style={styles.emptyHead}>quiet.</Text>
        <Text style={styles.emptySub}>nothing cast near you right now.</Text>
      </View>
      <View style={{ paddingBottom: tokens.component.posterBottomReserve }}>
        <BarButton label="cast something" variant="onOrange" onPress={() => router.push('/compose')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, backgroundColor: tokens.semantic.color.cream, paddingHorizontal: 24 },
  emptyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  wordmark: { ...tokens.typography.tag, color: tokens.semantic.color.textMutedOnCream },
  emptyMiddle: { flex: 1, justifyContent: 'center' },
  emptyHead: {
    fontFamily: fontFamily.display,
    fontSize: 46,
    lineHeight: 46,
    letterSpacing: -1.15,
    color: tokens.semantic.color.ink,
  },
  emptySub: {
    fontFamily: fontFamily.display,
    fontSize: 46,
    lineHeight: 46,
    letterSpacing: -1.15,
    color: tokens.semantic.color.textMutedOnCream,
    marginTop: 4,
  },
});
