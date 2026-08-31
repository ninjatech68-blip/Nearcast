import { describe, expect, it } from 'vitest';

import { FEED_FILTER_LABELS, filterCasts } from './feed-filter';

const near = { id: 'a', nearby: true };
const far = { id: 'b', nearby: false };

describe('filterCasts', () => {
  it('shows everything by default so nothing is hidden unasked', () => {
    expect(filterCasts([near, far], 'all')).toEqual([near, far]);
  });

  it('narrows to nearby when the viewer chooses it', () => {
    expect(filterCasts([near, far], 'nearby')).toEqual([near]);
  });

  it('returns empty rather than falling back to everything', () => {
    expect(filterCasts([far], 'nearby')).toEqual([]);
  });

  it('does not mutate or alias the source list', () => {
    const source = [near, far];
    const result = filterCasts(source, 'all');

    result.pop();

    expect(source).toHaveLength(2);
  });
});

describe('FEED_FILTER_LABELS', () => {
  it('uses interface vocabulary', () => {
    expect(FEED_FILTER_LABELS.all).toBe('All casts');
    expect(FEED_FILTER_LABELS.nearby).toBe('Nearby');
  });
});
