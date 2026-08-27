/**
 * the delivery framework: why a cast reaches a person.
 *
 * product law (AGENTS.md): every recommendation needs a stored,
 * human-readable delivery reason. this module is that law as code —
 * a cast is delivered only if it passes the eligibility gates, and
 * the reason shown is GENERATED from the signals that actually
 * matched. a reason can never be written by hand and never cites a
 * signal that didn't fire.
 *
 * pure domain: no react, no supabase, no i/o.
 */

export type TrustDistance = 'shared-circle' | 'one-link' | 'context-only' | 'none';

export type ViewerContext = {
  /** approved neighborhood names, always approximate */
  areas: readonly string[];
  /** circles the viewer belongs to */
  circleIds: readonly string[];
  /** circles one trusted link away */
  adjacentCircleIds: readonly string[];
  /** categories from the viewer's onboarding picks and own joins (their actions, nothing inferred) */
  interests: readonly string[];
  /** coarse activity pattern, e.g. 'weekday-evening' */
  activeWindows: readonly string[];
  blockedCasterIds: readonly string[];
};

export type DeliverableCast = {
  casterId: string;
  area: string;
  /** exactly one category per cast */
  category: string;
  /** human label for reasons, e.g. 'sports' */
  categoryLabel: string;
  /** coarse time window of the plan */
  window: string | null;
  reach: 'origin_only' | 'adjacent_network' | 'nearby_relevant' | 'broader_approved';
  casterCircleIds: readonly string[];
};

export type Delivery =
  | { deliver: false }
  | {
      deliver: true;
      score: number;
      /** the human-readable line, generated from matched signals only */
      reason: string;
      /** every signal that fired, for the transparency surface */
      signals: readonly string[];
    };

/** what delivery NEVER reads. shown verbatim on the transparency surface. */
export const NEVER_USED = [
  'your exact location',
  'your contacts',
  'your messages',
  'what you type before you cast',
  'whose profiles you look at',
] as const;

function trustDistance(viewer: ViewerContext, cast: DeliverableCast): TrustDistance {
  if (cast.casterCircleIds.some((id) => viewer.circleIds.includes(id))) return 'shared-circle';
  if (cast.casterCircleIds.some((id) => viewer.adjacentCircleIds.includes(id))) return 'one-link';
  return 'none';
}

export function deliveryFor(viewer: ViewerContext, cast: DeliverableCast): Delivery {
  // hard gates first: blocking always wins, then the reach the caster chose.
  if (viewer.blockedCasterIds.includes(cast.casterId)) return { deliver: false };

  const distance = trustDistance(viewer, cast);
  const areaMatch = viewer.areas.includes(cast.area);
  const categoryMatch = viewer.interests.includes(cast.category);
  const windowMatch = cast.window !== null && viewer.activeWindows.includes(cast.window);

  switch (cast.reach) {
    case 'origin_only':
      if (distance !== 'shared-circle') return { deliver: false };
      break;
    case 'adjacent_network':
      if (distance === 'none') return { deliver: false };
      break;
    case 'nearby_relevant':
      // strangers need BOTH place and a shared thread — never place alone.
      if (distance === 'none' && (!areaMatch || !categoryMatch)) return { deliver: false };
      break;
    case 'broader_approved':
      if (distance === 'none' && !areaMatch) return { deliver: false };
      break;
  }

  // score and reason come from the same signal list, so they can't diverge.
  const signals: string[] = [];
  let score = 0;

  if (distance === 'shared-circle') {
    score += 3;
    signals.push('your circle vouches');
  } else if (distance === 'one-link') {
    score += 2;
    signals.push('one trusted link away');
  }
  if (areaMatch) {
    score += 1;
    signals.push(`near you in ${cast.area}`);
  }
  if (categoryMatch) {
    score += 1;
    signals.push(`you're into ${cast.categoryLabel}`);
  }
  if (windowMatch) {
    score += 1;
    signals.push(`you're usually up for ${cast.window!.replace('-', ' ')}s`);
  }

  if (signals.length === 0) return { deliver: false };

  return {
    deliver: true,
    score,
    // the two strongest signals, in the order they were weighed
    reason: signals.slice(0, 2).join(' · '),
    signals,
  };
}
