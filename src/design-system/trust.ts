/**
 * Trust display is standardised by DESIGN.md as `Trust 812 · High trust`.
 *
 * Trust is a context signal, never a popularity or safety guarantee, so this
 * module refuses to render ratings, percentages, follower counts, or likes.
 */
const POPULARITY_SHAPED = /%|\bstars?\b|\bfollowers?\b|\blikes?\b|\bratings?\b|^\s*\d+(\.\d+)?\s*$/i;

export type TrustDisplay = {
  /** A whole, non-negative trust count. */
  score: number;
  /** A human-readable band such as `High trust`. */
  band: string;
};

export function formatTrustDisplay({ score, band }: TrustDisplay): string {
  if (!Number.isInteger(score) || score < 0) {
    throw new Error('Trust score must be a whole, non-negative count.');
  }

  const label = band.trim();

  if (label.length === 0) {
    throw new Error('Trust band must be human-readable.');
  }

  if (POPULARITY_SHAPED.test(label)) {
    throw new Error('Trust band must not read as a rating, percentage, or popularity count.');
  }

  return `Trust ${score} · ${label}`;
}
