import { useEffect, useState } from 'react';

import type { Category } from '@/design-system/tokens';
import { getSupabase } from '@/infrastructure/supabase/client';
import { expiryLabel } from './remote';
import { distanceLabel } from './domain/distance';

/**
 * The full picture of a plan you are in or posted — for the plan-detail
 * screen that "you're in" and "your casts" open. Read through the
 * plan_detail RPC, which only answers the caster and matched joiners.
 */
export type PlanDetail = {
  intentId: string;
  category: Category;
  statement: string;
  area: string;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
  startsAt: string | null;
  expiresAt: string;
  expiryLabel: string;
  status: string;
  casterId: string;
  casterName: string;
  isMine: boolean;
  participantCount: number;
  participantNames: readonly string[];
};

function isCategory(v: string): v is Category {
  return ['sports', 'games', 'arts', 'social', 'help', 'favors', 'travel', 'food'].includes(v);
}

export async function fetchPlanDetail(intentId: string): Promise<PlanDetail | null> {
  const c = getSupabase();
  if (!c) return null;
  const { data, error } = await c.rpc('plan_detail', { target_intent_id: intentId });
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0] as
    | {
        intent_id: string;
        category: string;
        statement: string;
        area: string | null;
        latitude: number | null;
        longitude: number | null;
        radius_km: number | null;
        starts_at: string | null;
        expires_at: string;
        status: string;
        caster_id: string;
        caster_first_name: string | null;
        is_mine: boolean;
        participant_count: number;
        participant_names: string[] | null;
      }
    | undefined;
  if (!row) return null;
  return {
    intentId: row.intent_id,
    category: isCategory(row.category) ? row.category : 'social',
    statement: row.statement,
    area: row.area ?? 'nearby',
    latitude: row.latitude,
    longitude: row.longitude,
    radiusKm: row.radius_km,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    expiryLabel: expiryLabel(row.expires_at),
    status: row.status,
    casterId: row.caster_id,
    casterName: row.caster_first_name ?? 'someone',
    isMine: row.is_mine,
    participantCount: row.participant_count,
    participantNames: row.participant_names ?? [],
  };
}

/** distance-from-me label for a plan's approximate point, when known. */
export function planDistanceLabel(_p: PlanDetail): string | null {
  return null; // reserved: plan_detail returns the plan's own point, not a delta
}

export { distanceLabel };

/** load a plan's detail for a screen; null until it arrives / with no backend. */
export function usePlanDetail(intentId: string | undefined): {
  plan: PlanDetail | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
} {
  const active = !!intentId && getSupabase() !== null;
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(active);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!active || !intentId) return; // nothing to fetch; loading was seeded false
    let cancelled = false;
    void fetchPlanDetail(intentId)
      .then((p) => {
        if (!cancelled) setPlan(p);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, intentId, nonce]);

  return { plan, loading, error, reload: () => setNonce((n) => n + 1) };
}

/** edit a cast's words + category — refused once anyone has engaged. */
export async function editCast(intentId: string, statement: string, category: Category): Promise<void> {
  const c = getSupabase();
  if (!c) return;
  const { error } = await c.rpc('edit_cast', {
    target_intent_id: intentId,
    new_statement: statement.trim(),
    new_category: category,
  });
  if (error) throw new Error(error.message);
}
