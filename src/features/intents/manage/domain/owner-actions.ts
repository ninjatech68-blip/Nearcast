import type { IntentStatus } from '@/features/intents/domain/lifecycle';

/**
 * What an owner may do to their own intent, derived from its status.
 *
 * The screen contract requires one CTA determined by role and lifecycle, so the
 * set of offered actions is computed here rather than assembled in JSX. An
 * action that the server would refuse is never rendered: offering "withdraw" on
 * an already-withdrawn intent invites a failure the person cannot act on.
 *
 * Pure: no React Native, no Supabase.
 */

export const OWNER_ACTIONS = ['edit', 'withdraw', 'resolve', 'duplicate'] as const;

export type OwnerAction = (typeof OWNER_ACTIONS)[number];

const ACTIONS_BY_STATUS: Record<IntentStatus, readonly OwnerAction[]> = {
  // A draft never reaches this screen; it is device-local until published.
  draft: [],
  live: ['edit', 'withdraw', 'resolve', 'duplicate'],
  // A matched intent has a coordination room open, so editing its terms would
  // move the ground under an agreement already being acted on.
  matched: ['resolve', 'withdraw', 'duplicate'],
  resolved: ['duplicate'],
  expired: ['duplicate'],
  withdrawn: ['duplicate'],
  // Restricted is a moderation state. The owner is not told what triggered it
  // and is offered nothing that would look like an appeal disguised as an edit.
  restricted: [],
};

export function availableOwnerActions(status: IntentStatus): readonly OwnerAction[] {
  return ACTIONS_BY_STATUS[status];
}

export function canOwnerTake(status: IntentStatus, action: OwnerAction): boolean {
  return ACTIONS_BY_STATUS[status].includes(action);
}

/**
 * Status copy for `IntentStatusHeader`. Factual and non-celebratory: it reports
 * what is true of the intent, never how many people might be looking at it.
 */
export function describeStatus(status: IntentStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft, saved on this device';
    case 'live':
      return 'Live and accepting responses';
    case 'matched':
      return 'Matched, coordination open';
    case 'resolved':
      return 'Resolved';
    case 'expired':
      return 'Expired, no longer accepting responses';
    case 'withdrawn':
      return 'Withdrawn, no longer accepting responses';
    case 'restricted':
      return 'Under review';
  }
}

/** Whether the intent still takes new responses, matching the insert policy. */
export function acceptsResponses(status: IntentStatus, expiresAt: Date, now: Date): boolean {
  return status === 'live' && expiresAt.getTime() > now.getTime();
}

export const MATERIAL_CHANGE_FIELDS = ['time', 'price', 'location', 'eligibility'] as const;

export type MaterialChange = (typeof MATERIAL_CHANGE_FIELDS)[number];

/**
 * MUST-017: a material change must be visible to existing respondents. The
 * server records which fields changed; this turns that record into a sentence
 * without inventing detail the event did not carry.
 */
export function describeMaterialChanges(changes: readonly MaterialChange[]): string | null {
  if (changes.length === 0) return null;

  const labels: Record<MaterialChange, string> = {
    time: 'timing',
    price: 'price',
    location: 'location',
    eligibility: 'who can respond',
  };

  const named = changes.map((change) => labels[change]);

  if (named.length === 1) return `The ${named[0]} changed after you responded`;

  const last = named[named.length - 1];
  const rest = named.slice(0, -1).join(', ');

  return `The ${rest} and ${last} changed after you responded`;
}
