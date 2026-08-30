import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Animated, FlatList, Pressable, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Refreshing } from '@/design-system/components/refreshing';
import { useRefresher } from '@/infrastructure/net/use-refresher';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { Poster } from '@/design-system/components/poster';
import { haptic } from '@/design-system/haptics';
import { category as categoryTokens, fontFamily, tokens } from '@/design-system/tokens';
import { NEVER_USED } from '@/features/casts/domain/delivery';
import { facePhotos, isVerified } from '@/features/casts/faces';
import { type CastDetail } from '@/features/casts/fixtures';
import {
  applyLens,
  refreshFeed,
  setFilter,
  setQuery,
  skipCast,
  useFeedCasts,
  useFilter,
  useQuery,
} from '@/features/casts/store';
import { remoteEnabled } from '@/features/casts/remote';

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
  const query = useQuery();
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(remoteEnabled());
  const [reloadKey, setReloadKey] = useState(0);

  const visible = useMemo(() => applyLens(all, filter, query), [all, filter, query]);

  /**
   * Pull the delivered feed on mount, and again on retry.
   *
   * The error state matters more here than anywhere else in the app:
   * a feed that failed to load and a feed with nothing in it render
   * identically unless we keep them apart, and "quiet." is a lie when
   * the truth is that the request never came back.
   *
   * A reload counter rather than a callback because every state
   * change has to land after the await — setting state in the body of
   * an effect is what makes React cascade renders.
   */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!remoteEnabled()) return;
      try {
        await refreshFeed();
        if (!cancelled) setLoadError(false);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setLoading(true);
    setLoadError(false);
    setReloadKey((key) => key + 1);
  }

  // pull-to-refresh: the feed is delivered server-side, so a person who
  // knows a plan just went out needs a way to ask for it now rather than
  // waiting for the next mount. useRefresher holds the state long enough
  // for the indicator to actually be seen — see its own note.
  const { refreshing, onRefresh: pullRefresh } = useRefresher(async () => {
    await refreshFeed();
    setLoadError(false);
  });

  function skip(id: string) {
    haptic('light');
    skipCast(id);
  }

  // the lens is on when either half of it is set. one pill clears both.
  const lensOn = !!filter || query.trim().length > 0;
  const lensLabel = [
    query.trim().length > 0 ? `“${query.trim()}”` : null,
    filter ? filter.map((id) => categoryTokens[id].label.split(' ')[0]).join(' · ') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  function clearLens() {
    setFilter(null);
    setQuery('');
  }

  const filterPill = lensOn ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="clear filter"
      onPress={clearLens}
      style={[styles.filterPill, { top: insets.top + 62 }]}
    >
      <Text style={styles.filterPillText}>
        {lensLabel}
        <Text style={styles.filterPillClear}> · clear</Text>
      </Text>
    </Pressable>
  ) : null;

  if (visible.length === 0) {
    return (
      <View style={{ width, height }}>
        <FeedEmpty
          filtered={lensOn}
          onClear={clearLens}
          loading={loading}
          failed={loadError}
          onRetry={retry}
        />
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
        // one full-screen poster per page: render exactly what is on
        // screen, keep one neighbour warm, and let RN detach the rest so
        // offscreen posters stop costing memory and layout work.
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={pullRefresh}
            tintColor={tokens.semantic.color.accent}
          />
        }
        style={{ width }}
      />
      {/* the platform spinner is drawn behind a full-bleed poster and
          lands on whatever colour that category is. this rides on top. */}
      <View style={[styles.refreshSlot, { top: insets.top + 60 }]} pointerEvents="none">
        <Refreshing visible={refreshing} label="looking for casts…" />
      </View>
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
          verified: isVerified(cast.byId),
        }}
        onOpenCaster={() => router.push(`/caster/${cast.byId}`)}
        onWhyPress={() => explainDelivery(cast)}
        onWordmarkPress={() => router.push('/filter')}
      >
        <BarButton
          label="ask to join"
          variant={fg === tokens.semantic.color.cream ? 'onCream' : 'onInk'}
          onPress={() => router.push(`/join/${cast.id}`)}
        />
        <QuietAction label="skip" color={fg} onPress={playSkip} />
      </Poster>
    </Animated.View>
  );
}

function FeedEmpty({
  filtered,
  onClear,
  loading,
  failed,
  onRetry,
}: {
  filtered: boolean;
  onClear?: () => void;
  loading?: boolean;
  failed?: boolean;
  onRetry?: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.empty, { paddingTop: insets.top + 24, paddingBottom: insets.bottom }]}>
      <View style={styles.emptyTop}>
        <Text style={styles.wordmark}>NEARCAST</Text>
        <AvatarDot />
      </View>
      <View style={styles.emptyMiddle}>
        <Text style={styles.emptyHead}>{failed ? "couldn't load." : loading ? 'loading…' : 'quiet.'}</Text>
        <Text style={styles.emptySub}>
          {failed
            ? "we couldn't reach the server. this isn't an empty feed. we don't know what's out there yet."
            : loading
              ? 'finding what was cast near you.'
              : filtered
                ? 'nothing matches that right now.'
                : 'nothing cast near you right now.'}
        </Text>
      </View>
      <View style={{ paddingBottom: tokens.component.posterBottomReserve }}>
        {failed ? (
          <BarButton label="try again" variant="onOrange" onPress={onRetry ?? (() => undefined)} />
        ) : loading ? null : filtered ? (
          <BarButton label="show everything" variant="onInk" onPress={onClear ?? (() => setFilter(null))} />
        ) : (
          <BarButton label="cast something" variant="onOrange" onPress={() => router.push('/compose')} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  refreshSlot: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
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
