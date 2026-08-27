import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFamily, tokens, verbColor, verbForeground, verbLabel, type Verb } from '@/design-system/tokens';

export type PosterData = {
  id: string;
  verb: Verb;
  text: string;
  area: string;
  vouches: string;
  expiry: string;
  why: string;
};

/**
 * one cast fills the viewport. the verb is the color, so no category
 * chip exists. the why line rides on every poster: that is product law.
 */
export function Poster({
  cast,
  topRight,
  children,
  onOpen,
  reserveRail = true,
  badge,
  tagLabel,
  casterLine,
  onOpenCaster,
}: {
  cast: PosterData;
  topRight?: ReactNode;
  children?: ReactNode;
  onOpen?: () => void;
  reserveRail?: boolean;
  badge?: ReactNode;
  tagLabel?: string;
  casterLine?: string;
  onOpenCaster?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const fg = verbForeground[cast.verb];
  const muted = cast.verb === 'got' ? 'rgba(244,239,228,0.62)' : 'rgba(20,18,14,0.62)';
  const meta = [cast.area, cast.vouches, cast.expiry].filter(Boolean).join(' · ');

  const headline = (
    <View>
      {badge ? <View style={styles.badge}>{badge}</View> : null}
      <Text style={[styles.verb, { color: fg }]}>{tagLabel ?? verbLabel[cast.verb]}</Text>
      <Text style={[styles.cast, { color: fg }]}>{cast.text}</Text>
    </View>
  );

  return (
    <View
      style={[
        styles.poster,
        {
          backgroundColor: verbColor[cast.verb],
          paddingTop: insets.top + 24,
          paddingBottom: reserveRail ? tokens.component.posterBottomReserve : insets.bottom + 16,
        },
      ]}
    >
      <View style={styles.top}>
        <Text style={[styles.wordmark, { color: fg }]}>NEARCAST</Text>
        {topRight}
      </View>
      <View style={styles.middle}>
        {onOpen ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Open cast: ${cast.text}`} onPress={onOpen}>
            {headline}
          </Pressable>
        ) : (
          headline
        )}
      </View>
      <View>
        {casterLine ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`about ${casterLine}`}
            hitSlop={8}
            disabled={!onOpenCaster}
            onPress={onOpenCaster}
            style={styles.casterTap}
          >
            <Text style={[styles.caster, { color: fg }]}>cast by {casterLine} ›</Text>
          </Pressable>
        ) : null}
        <Text style={[styles.meta, casterLine ? styles.metaTight : null, { color: fg }]}>{meta}</Text>
        {cast.why ? <Text style={[styles.why, { color: muted }]}>why you: {cast.why}</Text> : null}
        {children ? <View style={styles.bar}>{children}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  poster: { flex: 1, paddingHorizontal: 24 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  wordmark: { ...tokens.typography.tag },
  middle: { flex: 1, justifyContent: 'center' },
  badge: { marginBottom: 18 },
  verb: { ...tokens.typography.tag, marginBottom: 14 },
  cast: {
    fontFamily: fontFamily.display,
    fontSize: tokens.typography.cast.fontSize,
    lineHeight: tokens.typography.cast.lineHeight,
    letterSpacing: tokens.typography.cast.letterSpacing,
    maxWidth: 330,
  },
  casterTap: { minHeight: 32, justifyContent: 'flex-end', marginTop: 10 },
  caster: { ...tokens.typography.meta, fontFamily: 'IBMPlexMono_600SemiBold' },
  meta: { ...tokens.typography.meta, marginTop: 18 },
  metaTight: { marginTop: 4 },
  why: { ...tokens.typography.metaSmall, marginTop: 6 },
  bar: { marginTop: 24, gap: 2 },
});
