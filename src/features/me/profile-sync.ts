/**
 * Push the local `me` state up to the profile tables.
 *
 * The device stays the source of truth for who you are — you change
 * your areas and interests offline, in a store that persists — and
 * this mirrors that state to the rows delivery reads. It is one-way on
 * purpose: a pull would let a stale server row overwrite an edit the
 * person just made and watched take effect.
 *
 * Areas and interests are yours alone. RLS scopes both tables to the
 * owner, and nothing but a definer function ever reads them: a caster
 * deciding whether to accept you cannot see either.
 *
 * Called after sign-in and whenever those fields change. Idempotent —
 * running it twice writes the same rows.
 */

import type { Category } from '@/design-system/tokens';
import { centroidFor } from '@/features/casts/domain/geo';
import { getSupabase } from '@/infrastructure/supabase/client';
import type { AreaPoint } from './me-store';

export type ProfileSnapshot = {
  name: string;
  approvedAreas: readonly string[];
  /** name -> the centre the area picker resolved, where it has one */
  areaPoints?: Readonly<Record<string, AreaPoint>>;
  interests: readonly Category[];
  /** coarse habits, e.g. ['weekday-evening']. never a timestamp trail. */
  activeWindows?: readonly string[];
};

/**
 * Mirror the snapshot. Returns false when there is no backend, so a
 * caller can tell "nothing to do" from "it worked" — it throws when a
 * write genuinely fails, so `submit` renders the failure.
 */
export async function syncProfile(snapshot: ProfileSnapshot): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  const { data: sessionData } = await client.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return false;

  const displayName = snapshot.name.trim() || 'someone';
  const { error: profileError } = await client
    .from('profiles')
    .upsert(
      { id: user.id, display_name: displayName, active_windows: [...(snapshot.activeWindows ?? [])] },
      { onConflict: 'id' },
    );
  if (profileError) throw new Error(profileError.message);

  await syncAreas(client, user.id, snapshot.approvedAreas, snapshot.areaPoints ?? {});
  await syncInterests(client, user.id, snapshot.interests);
  return true;
}

type Client = NonNullable<ReturnType<typeof getSupabase>>;

/**
 * Areas are replaced, not merged: removing one on the device has to
 * remove it here, or a neighbourhood you left keeps delivering to you.
 *
 * The centroid is whatever the area picker resolved. When we cannot
 * place a name we store the name alone — delivery falls back to
 * matching it, which is coarse but never silently stops.
 */
async function syncAreas(
  client: Client,
  profileId: string,
  areas: readonly string[],
  points: Readonly<Record<string, AreaPoint>>,
): Promise<void> {
  const wanted = areas.map((area) => area.trim()).filter((area) => area.length > 0);

  const { error: deleteError } = await client
    .from('profile_areas')
    .delete()
    .eq('profile_id', profileId)
    .not('name', 'in', `(${wanted.map((a) => `"${a}"`).join(',') || '""'})`);
  if (deleteError) throw new Error(deleteError.message);

  if (wanted.length === 0) return;

  const rows = wanted.map((name) => {
    // what the picker resolved wins. `centroidFor` only covers the
    // handful of seeded fixture areas, and is the fallback for a
    // profile that predates the picker.
    const point = points[name.toLowerCase()] ?? points[name] ?? centroidFor(name);
    return {
      profile_id: profileId,
      name,
      centroid: point ? `SRID=4326;POINT(${point.longitude} ${point.latitude})` : null,
    };
  });

  const { error } = await client.from('profile_areas').upsert(rows, { onConflict: 'profile_id,name' });
  if (error) throw new Error(error.message);
}

/** same replace-don't-merge rule: unpicking an interest has to land. */
async function syncInterests(
  client: Client,
  profileId: string,
  interests: readonly Category[],
): Promise<void> {
  const { error: deleteError } = await client
    .from('profile_interests')
    .delete()
    .eq('profile_id', profileId)
    .not('category', 'in', `(${interests.join(',') || 'social'})`);
  if (deleteError && interests.length > 0) throw new Error(deleteError.message);

  if (interests.length === 0) return;

  const { error } = await client
    .from('profile_interests')
    .upsert(
      interests.map((category) => ({ profile_id: profileId, category })),
      { onConflict: 'profile_id,category' },
    );
  if (error) throw new Error(error.message);
}
