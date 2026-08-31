export const FEED_FILTERS = ['all', 'nearby'] as const;

export type FeedFilter = (typeof FEED_FILTERS)[number];

export const FEED_FILTER_LABELS: Record<FeedFilter, string> = {
  all: 'All casts',
  nearby: 'Nearby',
};

/**
 * Narrows the feed to a scope the viewer chose. `all` is the default so the
 * feed never hides a cast the viewer has not asked to hide.
 */
export function filterCasts<T extends { nearby: boolean }>(
  casts: readonly T[],
  filter: FeedFilter,
): T[] {
  return filter === 'nearby' ? casts.filter((cast) => cast.nearby) : [...casts];
}
