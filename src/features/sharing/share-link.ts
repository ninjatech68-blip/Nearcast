/**
 * The public share link, and the words around it.
 *
 * Controlled broadcast is the product's mechanism: an intent leaves a
 * closed group without the group being exposed. Everything here is about
 * the leaving half, and the rule it keeps is that nothing in a shared
 * message or a confirmation count says where the cast came from or who
 * stands behind it.
 *
 * Pure: no React Native, no Supabase.
 */

export type ShareLink =
  | { kind: 'web'; url: string }
  | { kind: 'app'; url: string };

/** the deep link scheme, matching app.json */
const APP_SCHEME = 'nearcast';

/**
 * MUST-020 asks for an HTTPS link, which needs a domain serving
 * apple-app-site-association. Until one exists, the app scheme is the
 * honest fallback: it opens for someone who already has Nearcast, and
 * `shareMessageFor` says as much rather than implying otherwise.
 *
 * A non-HTTPS origin is treated as no origin. A share link is pasted into
 * chat apps and lives longer than the build, and plain http is refused by
 * App Transport Security anyway.
 */
export function shareLinkFor(shareSlug: string, origin: string): ShareLink {
  const trimmed = origin.trim().replace(/\/+$/, '');

  if (trimmed.startsWith('https://')) {
    return { kind: 'web', url: `${trimmed}/i/${shareSlug}` };
  }

  return { kind: 'app', url: `${APP_SCHEME}://i/${shareSlug}` };
}

export function shareMessageFor(statement: string, link: ShareLink): string {
  if (link.kind === 'app') {
    return `${statement}\n\n${link.url}\n(opens if you have nearcast installed)`;
  }

  return `${statement}\n\n${link.url}`;
}

/**
 * Confirmation, in words.
 *
 * Zero is stated rather than hidden: an intent nobody has confirmed is a
 * real thing to know, and dressing it up would be the beginning of
 * fabricated social proof. A count is unique authenticated people, which
 * the primary key on (intent_id, confirmer_id) guarantees.
 *
 * No name ever appears. The recipient learns there is support; they do not
 * learn who gave it, because that is the origin circle's membership.
 */
export function describeConfirmations(count: number, viewerHasConfirmed: boolean): string {
  if (viewerHasConfirmed) {
    const others = Math.max(0, count - 1);

    if (others === 0) return 'you confirmed this';

    return others === 1
      ? 'you and 1 other person confirmed this'
      : `you and ${others} other people confirmed this`;
  }

  if (count === 0) return 'nobody has confirmed this yet';

  return count === 1 ? '1 person confirmed this' : `${count} people confirmed this`;
}
