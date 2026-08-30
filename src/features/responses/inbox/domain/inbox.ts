import type { ResponseStatus } from '@/features/responses/inbox/domain/status';

/**
 * The broadcaster's inbox.
 *
 * Only the broadcaster reads every response to their intent; a respondent sees
 * their own and nothing else, which RLS enforces. Nothing here aggregates or
 * ranks responses, because presenting them as a leaderboard would turn a
 * request for help into a competition the respondents cannot see they are in.
 *
 * Pure: no React Native, no Supabase.
 */

export const INBOX_DECISIONS = ['accept', 'decline'] as const;

export type InboxDecision = (typeof INBOX_DECISIONS)[number];

/**
 * Decisions are offered only on a pending response, and only while the intent
 * can still be matched. An intent that already has a match cannot take another,
 * so offering accept there would promise something the server refuses.
 */
export function availableDecisions(
  responseStatus: ResponseStatus,
  intentIsMatchable: boolean,
): readonly InboxDecision[] {
  if (responseStatus !== 'pending') return [];

  return intentIsMatchable ? INBOX_DECISIONS : ['decline'];
}

/**
 * Status copy shown to the broadcaster. Factual, and never a judgement of the
 * person: a declined response reports the decision, not a reason.
 */
export function describeResponseStatus(status: ResponseStatus): string {
  switch (status) {
    case 'pending':
      return 'Waiting for your decision';
    case 'accepted':
      return 'Accepted, coordination open';
    case 'declined':
      return 'Declined';
    case 'withdrawn':
      return 'Withdrawn by them';
  }
}

/**
 * Qualification claims, rendered from the stored payload.
 *
 * Only keys present and true are shown. The payload never stores false, so an
 * absent key means the person made no claim, and the inbox must not render that
 * absence as a negative claim about them.
 */
export function listClaims(
  qualification: Record<string, unknown>,
  labels: Record<string, string>,
): string[] {
  return Object.entries(qualification)
    .filter(([, value]) => value === true)
    .map(([key]) => labels[key])
    .filter((label): label is string => label !== undefined);
}
