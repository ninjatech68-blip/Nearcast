/**
 * Circles data layer, backend mode. A circle is owner-only; adding a
 * member is gated in the database by a shared receipt, so vouching
 * stays a trust act, not a follow. Reads that a member can't run
 * against RLS (who vouches for me) come back through definer RPCs that
 * expose owner names only, never the circle.
 */

import { getSupabase } from '@/infrastructure/supabase/client';

export type RemoteCircleRow = {
  circle_id: string;
  name: string;
  member_id: string | null;
  member_first_name: string | null;
  member_area: string | null;
};

export function circlesEnabled(): boolean {
  return getSupabase() !== null;
}

export async function fetchMyCircles(): Promise<readonly RemoteCircleRow[]> {
  const c = getSupabase();
  if (!c) return [];
  const { data, error } = await c.rpc('my_circles');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RemoteCircleRow[];
}

export async function createCircleRemote(name: string): Promise<string> {
  const c = getSupabase();
  if (!c) throw new Error('no backend configured');
  const { data, error } = await c.rpc('create_circle', { circle_name: name });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('create returned no id');
  return data as string;
}

export async function addToCircleRemote(circleId: string, memberId: string): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error('no backend configured');
  const { error } = await c.rpc('add_to_circle', { target_circle: circleId, member: memberId });
  if (error) throw new Error(error.message);
}

export async function removeFromCircleRemote(circleId: string, memberId: string): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error('no backend configured');
  const { error } = await c.rpc('remove_from_circle', { target_circle: circleId, member: memberId });
  if (error) throw new Error(error.message);
}

export async function fetchVouchersOfMe(): Promise<readonly string[]> {
  const c = getSupabase();
  if (!c) return [];
  const { data, error } = await c.rpc('vouches_for_me');
  if (error) throw new Error(error.message);
  return ((data ?? []) as { voucher_first_name: string | null }[])
    .map((r) => r.voucher_first_name ?? 'someone');
}
