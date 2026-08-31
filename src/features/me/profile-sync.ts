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

  // An UPDATE, not an upsert. Membership is created by redeeming an
  // invitation and by nothing else — the client insert policy on
  // `profiles` is gone — so an upsert here would fail for a non-member
  // rather than enrol them, and quietly enrol them if the policy ever
  // came back. Mirroring a profile is upkeep; it is not a way to join.
  const { data: updated, error: profileError } = await client
    .from('profiles')
    .update({
      display_name: displayName,
      active_windows: [...(snapshot.activeWindows ?? [])],
    })
    .eq('id', user.id)
    .select('id');
  if (profileError) throw new Error(profileError.message);

  // No row means this account never redeemed an invitation. There is
  // nothing to mirror and nothing to report: onboarding is where that is
  // resolved, and it has its own message for it.
  if (!updated || updated.length === 0) return false;

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

/**
 * Read the signed-in user's own profile back from the backend.
 *
 * Returns null when there is no backend, no session, or no usable
 * profile yet (a brand-new account that has not finished onboarding).
 * "Usable" means a real name AND at least one area — the two things
 * onboarding sets — because that is exactly the test for "this person
 * has been through setup already, do not show it again".
 *
 * Areas come back with their centroids as lat/lng so a restored profile
 * keeps delivery measuring distance, and the write that follows does
 * not silently drop the points.
 */
export type OwnProfile = {
  name: string;
  approvedAreas: readonly string[];
  areaPoints: Record<string, AreaPoint>;
  interests: readonly Category[];
};

export async function fetchOwnProfile(): Promise<OwnProfile | null> {
  const client = getSupabase();
  if (!client) return null;

  const { data: sessionData } = await client.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  const [{ data: profile }, { data: areaRows }, { data: interestRows }] = await Promise.all([
    client.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
    client.rpc('my_profile_areas'),
    client.from('profile_interests').select('category').eq('profile_id', user.id),
  ]);

  const name = (profile?.display_name ?? '').trim();
  const areas = (areaRows ?? []) as { name: string; latitude: number | null; longitude: number | null }[];
  // not set up yet: let the shell send them into onboarding as normal.
  if (!name || name === 'someone' || areas.length === 0) return null;

  const areaPoints: Record<string, AreaPoint> = {};
  for (const a of areas) {
    if (a.latitude !== null && a.longitude !== null) {
      areaPoints[a.name] = { latitude: a.latitude, longitude: a.longitude };
    }
  }
  const interests = ((interestRows ?? []) as { category: Category }[]).map((r) => r.category);

  return { name, approvedAreas: areas.map((a) => a.name), areaPoints, interests };
}
