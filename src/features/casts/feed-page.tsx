import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Animated, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { Poster } from '@/design-system/components/poster';
import { haptic } from '@/design-system/haptics';
import { category as categoryTokens, fontFamily, tokens } from '@/design-system/tokens';
import { NEVER_USED } from '@/features/casts/domain/delivery';
import { facePhotos } from '@/features/casts/faces';
import { type CastDetail } from '@/features/casts/fixtures';
import { setFilter, skipCast, useFeedCasts, useFilter } from '@/features/casts/store';

import { AvatarDot } from './avatar-dot';

function explainDelivery(cast: CastDetail) {
  const fired = (cast.signals ?? [cast.why]).map((signal) => `· ${signal}`).join('\n');
  const never = NEVER_USED.map((item) => `· ${item}`).join('\n');
  Alert.alert(
    "why you're seeing this",
    `this cast reached you because:\n${fired}\n\nnever used to decide:\n${never}`,
    [{ text: 'ok' }],
  );
}

/**
 * the feed: one cast per viewport, vertical snap. scrolling past a cast
 * is the passive skip. the filter is a session lens: while it's on, the
 * pill below the top row stays visible with one-tap clear.
 */
export function FeedPage({
  onScrollStateChange,
}: {
  onScrollStateChange?: (scrolling: boolean) => void;
}) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const all = useFeedCasts();
  const filter = useFilter();

  const visible = useMemo(
    () => (filter ? all.filter((cast) => filter.includes(cast.category)) : all),
    [all, filter],
  );

  function skip(id: string) {
    haptic('light');
    skipCast(id);
  }

  const filterPill = filter ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="clear filter"
      onPress={() => setFilter(null)}
      style={[styles.filterPill, { top: insets.top + 62 }]}
    >
      <Text style={styles.filterPillText}>
        {filter.map((id) => categoryTokens[id].label.split(' ')[0]).join(' · ')}
        <Text style={styles.filterPillClear}> · clear</Text>
      </Text>
    </Pressable>
  ) : null;

  if (visible.length === 0) {
    return (
      <View style={{ width, height }}>
        <FeedEmpty filtered={!!filter} />
        {filterPill}
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
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
      {filterPill}
    </View>
  );
}

function SkippablePoster({ cast, onSkip }: { cast: CastDetail; onSkip: () => void }) {
  const { width } = useWindowDimensions();
  const [exit] = useState(() => new Animated.Value(0));
  const fg = categoryTokens[cast.category].fg;

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
        topRight={<AvatarDot castCategory={cast.category} />}
        onOpen={() => router.push(`/cast/${cast.id}`)}
        caster={{
          line: `${cast.by.toLowerCase()} · ${cast.receipts.line.split(' · ')[0]}`,
          photo: facePhotos[cast.byId],
          initials: cast.by.slice(0, 2).toUpperCase(),
        }}
        onOpenCaster={() => router.push(`/caster/${cast.byId}`)}
        onWhyPress={() => explainDelivery(cast)}
        onWordmarkPress={() => router.push('/filter')}
      >
        <BarButton
          label="I'm in"
          variant={fg === tokens.semantic.color.cream ? 'onCream' : 'onInk'}
          onPress={() => router.push(`/join/${cast.id}`)}
        />
        <QuietAction label="skip" color={fg} onPress={playSkip} />
      </Poster>
    </Animated.View>
  );
}

function FeedEmpty({ filtered }: { filtered: boolean }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.empty, { paddingTop: insets.top + 24, paddingBottom: insets.bottom }]}>
      <View style={styles.emptyTop}>
        <Text style={styles.wordmark}>NEARCAST</Text>
        <AvatarDot />
      </View>
      <View style={styles.emptyMiddle}>
        <Text style={styles.emptyHead}>quiet.</Text>
        <Text style={styles.emptySub}>
          {filtered ? 'nothing cast in those categories right now.' : 'nothing cast near you right now.'}
        </Text>
      </View>
      <View style={{ paddingBottom: tokens.component.posterBottomReserve }}>
        {filtered ? (
          <BarButton label="show everything" variant="onInk" onPress={() => setFilter(null)} />
        ) : (
          <BarButton label="cast something" variant="onOrange" onPress={() => router.push('/compose')} />
        )}
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
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.85,
    color: tokens.semantic.color.textMutedOnCream,
    marginTop: 8,
  },
  filterPill: {
    position: 'absolute',
    left: 24,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: tokens.primitive.radius.pill,
    backgroundColor: tokens.semantic.color.ink,
    justifyContent: 'center',
  },
  filterPillText: {
    ...tokens.typography.tagSmall,
    color: tokens.semantic.color.cream,
    textTransform: 'uppercase',
  },
  filterPillClear: { color: tokens.semantic.color.accent },
});
