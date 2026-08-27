import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Face } from '@/design-system/components/face';
import { category as categoryTokens, fontFamily, polesFor, tokens, type Category } from '@/design-system/tokens';

export type PosterData = {
  id: string;
  category: Category;
  text: string;
  area: string;
  vouches: string;
  expiry: string;
  why: string;
};

/**
 * one cast fills the viewport. the category owns the field color AND
 * always appears in type above the headline — color is never the only
 * carrier. the why line rides on every poster: that is product law.
 * pills and dots follow the opposite-pole rule (see tokens.polesFor).
 */
export function Poster({
  cast,
  topRight,
  children,
  onOpen,
  reserveRail = true,
  badge,
  tagLabel,
  caster,
  onOpenCaster,
  onWhyPress,
  onWordmarkPress,
}: {
  cast: PosterData;
  topRight?: ReactNode;
  children?: ReactNode;
  onOpen?: () => void;
  reserveRail?: boolean;
  badge?: ReactNode;
  tagLabel?: string;
  caster?: { line: string; photo?: ImageSourcePropType; initials: string };
  onOpenCaster?: () => void;
  onWhyPress?: () => void;
  onWordmarkPress?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const spec = categoryTokens[cast.category];
  const fg = spec.fg;
  const poles = polesFor(cast.category);
  const muted = fg === tokens.semantic.color.cream ? 'rgba(244,239,228,0.62)' : 'rgba(20,18,14,0.62)';
  const meta = [cast.area, cast.vouches, cast.expiry].filter(Boolean).join(' · ');

  const headline = (
    <View>
      {badge ? <View style={styles.badge}>{badge}</View> : null}
      <Text style={[styles.categoryTag, { color: fg }]}>{tagLabel ?? spec.label.toUpperCase()}</Text>
      <Text style={[styles.cast, { color: fg }]}>{cast.text}</Text>
    </View>
  );

  return (
    <View
      style={[
        styles.poster,
        {
          backgroundColor: spec.field,
          paddingTop: insets.top + 24,
          paddingBottom: reserveRail ? tokens.component.posterBottomReserve : insets.bottom + 16,
        },
      ]}
    >
      <View style={styles.top}>
        {onWordmarkPress ? (
          <Pressable accessibilityRole="button" accessibilityLabel="filter the feed" hitSlop={10} onPress={onWordmarkPress}>
            <Text style={[styles.wordmark, { color: fg }]}>NEARCAST ⌄</Text>
          </Pressable>
        ) : (
          <Text style={[styles.wordmark, { color: fg }]}>NEARCAST</Text>
        )}
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
        {caster ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`about ${caster.line}`}
            hitSlop={6}
            disabled={!onOpenCaster}
            onPress={onOpenCaster}
            style={[styles.casterPill, { backgroundColor: poles.pillBg }]}
          >
            <Face photo={caster.photo} initials={caster.initials} size={22} label="" />
            <Text style={[styles.casterText, { color: poles.pillFg }]}>{caster.line} ›</Text>
          </Pressable>
        ) : null}
        <Text style={[styles.meta, { color: fg }]}>{meta}</Text>
        {cast.why ? (
          onWhyPress ? (
            <Pressable accessibilityRole="button" accessibilityLabel="why you're seeing this" hitSlop={8} onPress={onWhyPress}>
              <Text style={[styles.why, { color: muted }]}>why you: {cast.why} ›</Text>
            </Pressable>
          ) : (
            <Text style={[styles.why, { color: muted }]}>why you: {cast.why}</Text>
          )
        ) : null}
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
  categoryTag: { ...tokens.typography.tag, marginBottom: 14 },
  cast: {
    fontFamily: fontFamily.display,
    fontSize: tokens.typography.cast.fontSize,
    lineHeight: tokens.typography.cast.lineHeight,
    letterSpacing: tokens.typography.cast.letterSpacing,
    maxWidth: 335,
  },
  casterPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: tokens.primitive.radius.pill,
    marginBottom: 12,
  },
  casterText: { ...tokens.typography.metaSmall, fontFamily: 'IBMPlexMono_600SemiBold' },
  meta: { ...tokens.typography.meta },
  why: { ...tokens.typography.metaSmall, marginTop: 6 },
  bar: { marginTop: 20, gap: 2 },
});
