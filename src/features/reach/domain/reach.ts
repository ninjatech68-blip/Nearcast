import { INTENT_REACH_LEVELS, type IntentReachLevel } from '@/features/intents/domain/intent';

/**
 * Controlled reach.
 *
 * Widening is the one action that shows an intent to people who could not see
 * it a moment ago, so the selector must state the delta before it happens.
 * Narrowing is always offered without ceremony: making the safer action the
 * harder one would be the wrong incentive.
 *
 * Pure: no React Native, no Supabase.
 */

const RANK: Record<IntentReachLevel, number> = {
  origin_only: 0,
  adjacent_network: 1,
  nearby_relevant: 2,
  broader_approved: 3,
};

export const REACH_LABELS: Record<IntentReachLevel, string> = {
  origin_only: 'Only where you shared it',
  adjacent_network: 'People you both know',
  nearby_relevant: 'Nearby and relevant',
  broader_approved: 'A wider approved group',
};

export function isExpansion(
  from: IntentReachLevel,
  to: IntentReachLevel,
): boolean {
  return RANK[to] > RANK[from];
}

export function isReduction(
  from: IntentReachLevel,
  to: IntentReachLevel,
): boolean {
  return RANK[to] < RANK[from];
}

/** Levels offered next, ordered, excluding the one already held. */
export function selectableLevels(
  current: IntentReachLevel,
): readonly IntentReachLevel[] {
  return INTENT_REACH_LEVELS.filter((level) => level !== current);
}

/**
 * The audience a step adds, named rather than counted.
 *
 * A count would be a fabricated activity number: the app cannot know how many
 * people a level reaches without querying a graph it must not expose, and a
 * confident-looking figure would imply precision that does not exist.
 */
export function describeAudienceDelta(
  from: IntentReachLevel,
  to: IntentReachLevel,
): string | null {
  if (!isExpansion(from, to)) return null;

  switch (to) {
    case 'adjacent_network':
      return 'Adds people who share a connection with you';
    case 'nearby_relevant':
      return 'Adds nearby people this is relevant to, who you may not know';
    case 'broader_approved':
      return 'Adds a wider approved group beyond your immediate area';
    case 'origin_only':
      return null;
  }
}

/**
 * What changes about who can see this. Stated before the action, never after.
 */
export function describePrivacyImpact(
  from: IntentReachLevel,
  to: IntentReachLevel,
): string {
  if (isReduction(from, to)) {
    return 'Fewer people will see this from now on. Anyone who already saw it may still remember it.';
  }

  if (isExpansion(from, to)) {
    return 'Your statement, approximate area and first name become visible to more people. Your exact location and contact details stay private.';
  }

  return 'Nothing changes.';
}

/** Only an expansion requires an explicit confirmation. */
export function requiresDisclosureConfirmation(
  from: IntentReachLevel,
  to: IntentReachLevel,
): boolean {
  return isExpansion(from, to);
}
