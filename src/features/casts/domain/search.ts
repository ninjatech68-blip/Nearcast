/**
 * feed search: matching a typed query against a cast.
 *
 * This is a LENS, not a discovery mechanism. It narrows what you have
 * already been delivered — it can never surface a cast the delivery
 * framework decided not to send you. That distinction matters: search
 * must not become a back door around reach, because a cast you were
 * not meant to see should not be findable by guessing its words.
 *
 * Matching rules, in one place:
 *  - case- and accent-insensitive
 *  - every whitespace-separated term must match SOMETHING (AND, not
 *    OR) — "chess park" finds the chess-in-the-park cast, and does
 *    not also return every cast mentioning a park
 *  - a term matches on a word PREFIX, not an arbitrary substring, so
 *    "bad" finds "badminton" but "min" does not
 *  - searchable fields: the cast text, the caster's first name, the
 *    area, and the category label
 *
 * pure domain: no react, no supabase, no i/o.
 */

export type SearchableCast = {
  text: string;
  by: string;
  area: string;
  categoryLabel: string;
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    // strip combining marks so "café" matches "cafe"
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** the terms a query breaks into. exported for the count helpers. */
export function queryTerms(query: string): readonly string[] {
  return normalize(query)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

function haystackWords(cast: SearchableCast): readonly string[] {
  const joined = [cast.text, cast.by, cast.area, cast.categoryLabel].join(' ');
  return normalize(joined)
    // split on anything that isn't a letter or digit, so "food + drinks"
    // yields ["food", "drinks"] and punctuation never blocks a match
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
}

/** does this cast satisfy every term in the query? */
export function matchesQuery(cast: SearchableCast, query: string): boolean {
  const terms = queryTerms(query);
  if (terms.length === 0) return true; // an empty query narrows nothing
  const words = haystackWords(cast);
  return terms.every((term) => words.some((word) => word.startsWith(term)));
}
