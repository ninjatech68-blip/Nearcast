/**
 * Builds the shareable link for a published intent.
 *
 * MUST-020 requires an HTTPS link on a real domain; that domain is a human
 * action (H-4) still pending. Until it lands, links fall back to the app
 * scheme so publishing, sharing, and review can proceed. Swapping in the
 * domain is one environment variable — no code changes.
 */
export function buildShareLink(shareSlug: string, shareBaseUrl: string | null): string {
  if (shareBaseUrl) {
    return `${shareBaseUrl.replace(/\/+$/, '')}/i/${shareSlug}`;
  }
  return `nearcast://i/${shareSlug}`;
}
