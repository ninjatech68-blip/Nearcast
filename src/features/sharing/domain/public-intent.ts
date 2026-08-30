import { z } from 'zod';

import { INTENT_PRIMITIVES } from '@/features/intents/domain/intent';

/**
 * The public projection of an intent, as reached through a share link.
 *
 * This mirrors `get_public_intent` exactly. The schema is deliberately strict
 * rather than passthrough: if the projection ever grows a field it should not
 * have, parsing here drops it before it can reach a screen.
 */

export const publicIntentSchema = z.object({
  id: z.string(),
  shareSlug: z.string(),
  primitive: z.enum(INTENT_PRIMITIVES),
  statement: z.string(),
  responseAction: z.string(),
  expiresAt: z.string(),
  publishedAt: z.string().nullable(),
  startsAt: z.string().nullable(),
  deadlineAt: z.string().nullable(),
  quantity: z.number().nullable(),
  priceMinor: z.number().nullable(),
  currency: z.string().nullable(),
  approximatePlace: z.string().nullable(),
  broadcasterFirstName: z.string().nullable(),
  confirmationCount: z.number().int().nonnegative(),
});

export type PublicIntent = z.infer<typeof publicIntentSchema>;

/**
 * Confirmation copy.
 *
 * A count of unique authenticated people is the only supported claim. The copy
 * never names a confirmer, never implies a group, and never rounds a small
 * number up into something that sounds busier than it is: zero says zero.
 * MUST-025 also forbids implying that any WhatsApp group is verified, so no
 * wording here refers to the origin circle as vouched-for.
 */
export function describeConfirmations(
  count: number,
  viewerHasConfirmed: boolean,
): string {
  if (viewerHasConfirmed) {
    if (count <= 1) return 'You confirmed this';

    const others = count - 1;

    return others === 1
      ? 'You and 1 other person confirmed this'
      : `You and ${others} other people confirmed this`;
  }

  if (count === 0) return 'No one has confirmed this yet';
  if (count === 1) return '1 person confirmed this';

  return `${count} people confirmed this`;
}

/** Whether the link recipient may still act on this intent. */
export function isOpenForResponse(intent: PublicIntent, now: Date): boolean {
  return new Date(intent.expiresAt).getTime() > now.getTime();
}

/**
 * The message body for a system share. Carries the link and the statement the
 * broadcaster already chose to make public, and nothing else: no approximate
 * place, no first name, no confirmation count, because a share sheet forwards
 * into groups Nearcast cannot see.
 */
export function buildShareMessage(intent: PublicIntent, linkUrl: string): string {
  return `${intent.statement.trim()}\n\n${linkUrl}`;
}

export function buildShareUrl(shareSlug: string, origin: string): string {
  return `${origin.replace(/\/+$/, '')}/i/${shareSlug}`;
}
