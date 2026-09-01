import { describe, expect, it } from 'vitest';

import { matchesQuery, queryTerms, type SearchableCast } from './search';

const badminton: SearchableCast = {
  text: 'badminton after work. need two.',
  by: 'Aarav',
  area: 'indiranagar',
  categoryLabel: 'sports',
};

const chess: SearchableCast = {
  text: 'chess in the park sunday morning. bring a board.',
  by: 'Piyush',
  area: 'indiranagar',
  categoryLabel: 'games',
};

const brunch: SearchableCast = {
  text: 'sunday brunch, small table. two spots.',
  by: 'Kavya',
  area: 'koramangala',
  categoryLabel: 'food + drinks',
};

describe('feed search', () => {
  it('an empty query narrows nothing', () => {
    expect(matchesQuery(badminton, '')).toBe(true);
    expect(matchesQuery(badminton, '   ')).toBe(true);
  });

  it('matches on a word prefix, not an arbitrary substring', () => {
    expect(matchesQuery(badminton, 'bad')).toBe(true);
    // "min" sits inside "badminton" but is not a word prefix
    expect(matchesQuery(badminton, 'min')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(matchesQuery(badminton, 'BADMINTON')).toBe(true);
    expect(matchesQuery(badminton, 'aArAv')).toBe(true);
  });

  it('requires every term to match — AND, not OR', () => {
    // both terms present
    expect(matchesQuery(chess, 'chess park')).toBe(true);
    // "park" matches but "tennis" does not, so the cast is excluded
    expect(matchesQuery(chess, 'tennis park')).toBe(false);
  });

  it('searches the caster name, area, and category as well as the text', () => {
    expect(matchesQuery(badminton, 'aarav')).toBe(true);
    expect(matchesQuery(badminton, 'indiranagar')).toBe(true);
    expect(matchesQuery(badminton, 'sports')).toBe(true);
  });

  it('sees through punctuation in a category label', () => {
    expect(matchesQuery(brunch, 'drinks')).toBe(true);
    expect(matchesQuery(brunch, 'food')).toBe(true);
  });

  it('separates casts that share a word', () => {
    // both mention sunday; only one is chess
    expect(matchesQuery(chess, 'sunday')).toBe(true);
    expect(matchesQuery(brunch, 'sunday')).toBe(true);
    expect(matchesQuery(chess, 'sunday chess')).toBe(true);
    expect(matchesQuery(brunch, 'sunday chess')).toBe(false);
  });

  it('breaks a query into trimmed terms', () => {
    expect(queryTerms('  chess   park ')).toEqual(['chess', 'park']);
    expect(queryTerms('')).toEqual([]);
  });
});
