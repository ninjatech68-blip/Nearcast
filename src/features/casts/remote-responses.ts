/**
 * The join → accept/decline → withdraw loop, when a backend is
 * configured. Same two-mode contract as remote.ts: with no backend the
 * store keeps its fixture behaviour and none of this runs.
 *
 * A join is a `responses` row. The caster sees it on their own cast and
 * accepts (which creates the match + conversation) or declines. Because
 * the UI speaks in (castId, personId) but the server keys on a response
 * id, the caster-side reads carry the response id back so the store can
 * map one to the other.
 */

import { getSupabase } from '@/infrastructure/supabase/client';

export type RemoteMyCast = {
  intent_id: string;
  category: string;
  statement: string;
  area: string | null;
  starts_at: string | null;
  expires_at: string;
  status: string;
  pending_count: number;
  matched_count: number;
};

export type RemotePendingJoin = {
  response_id: string;
  intent_id: string;
  cast_statement: string;
  joiner_id: string;
  joiner_first_name: string | null;
  note: string;
  created_at: string;
};

export type RemoteSentJoin = {
  response_id: string;
  intent_id: string;
  cast_statement: string;
  caster_id: string;
  caster_first_name: string | null;
  note: string | null;
  status: string;
  created_at: string;
};

function client() {
  return getSupabase();
}

/** ask to join. idempotent server-side; returns the response id. */
export async function respondToCast(intentId: string, note: string): Promise<string> {
  const c = client();
  if (!c) throw new Error('no backend configured');
  const { data, error } = await c.rpc('respond_to_cast', { target_intent_id: intentId, note });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('join returned no id');
  return data as string;
}

/** caster: accept a request → creates the match and the chat. */
export async function acceptResponse(responseId: string): Promise<void> {
  const c = client();
  if (!c) throw new Error('no backend configured');
  const { error } = await c.rpc('accept_response', {
    response_to_accept: responseId,
    expected_intent_status: 'live',
  });
  if (error) throw new Error(error.message);
}

/** caster: decline. silent to the joiner. */
export async function declineResponse(responseId: string): Promise<void> {
  const c = client();
  if (!c) throw new Error('no backend configured');
  const { error } = await c.rpc('decline_response', { target_response_id: responseId });
  if (error) throw new Error(error.message);
}

/** joiner: take back a request. silent to the caster. */
export async function withdrawResponse(responseId: string): Promise<void> {
  const c = client();
  if (!c) throw new Error('no backend configured');
  const { error } = await c.rpc('withdraw_response', { target_response_id: responseId });
  if (error) throw new Error(error.message);
}

export async function fetchMyCasts(): Promise<readonly RemoteMyCast[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c.rpc('my_casts');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RemoteMyCast[];
}

export async function fetchPendingJoins(): Promise<readonly RemotePendingJoin[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c.rpc('pending_joins_on_my_casts');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RemotePendingJoin[];
}

export async function fetchSentJoins(): Promise<readonly RemoteSentJoin[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c.rpc('joins_i_sent');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RemoteSentJoin[];
}
