/**
 * Trust display is a factual trust-context line, standardised by DESIGN.md as
 * e.g. `One trusted connection from your network` or `8 of 9 confirmed
 * interactions were completed`.
 *
 * docs/04 forbids a single universal social-credit score and trust badges
 * that resemble guarantees, and docs/08 requires trust context over a trust
 * score — so this module refuses scores, bands, ratings, percentages,
 * follower counts, likes, and guarantee language.
 */
const POPULARITY_SHAPED = /%|\bstars?\b|\bfollowers?\b|\blikes?\b|\bratings?\b|^\s*\d+(\.\d+)?\s*$/i;

/** `Trust 812`, `Trust 812 · High trust` — the banned universal-score shape. */
const SCORE_SHAPED = /\btrust\s*[:\s]\s*\d+/i;

const GUARANTEE_SHAPED = /\bguarantee[ds]?\b|\b100%\s*safe\b|\btotally\s+safe\b|\btrusted\s+user\b/i;

/** The approved caveat (`Verification does not guarantee safety.`) is not a guarantee claim. */
const NEGATED_GUARANTEE = /\b(does|do|did|can)\s*not\s+guarantee\b/gi;

/**
 * Validates a trust-context line and returns it trimmed. Throws when the line
 * is empty, score-shaped, popularity-shaped, or implies a guarantee.
 */
export function assertTrustContext(line: string): string {
  const context = line.trim();

  if (context.length === 0) {
    throw new Error('Trust context must be human-readable.');
  }

  if (SCORE_SHAPED.test(context)) {
    throw new Error('Trust context must not be a universal trust score.');
  }

  if (GUARANTEE_SHAPED.test(context.replace(NEGATED_GUARANTEE, ''))) {
    throw new Error('Trust context must not imply guaranteed safety.');
  }

  if (POPULARITY_SHAPED.test(context.replace(NEGATED_GUARANTEE, ''))) {
    throw new Error('Trust context must not read as a rating, percentage, or popularity count.');
  }

  return context;
}
