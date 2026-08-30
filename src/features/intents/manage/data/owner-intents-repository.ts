import type { IntentStatus } from '@/features/intents/domain/lifecycle';
import { supabase } from '@/infrastructure/supabase/client';

/**
 * The owner's own intents.
 *
 * RLS already limits a broadcaster to their own rows, so no ownership filter is
 * applied here; the query cannot see anyone else's intents. Lifecycle
 * transitions go through the server functions, never through a direct update,
 * so the expected-version check cannot be bypassed by the client.
 */

export type OwnerIntent = {
  id: string;
  statement: string;
  status: IntentStatus;
  version: number;
  expiresAt: Date;
  shareSlug: string;
};

export async function fetchOwnerIntents(
  broadcasterId: string,
): Promise<OwnerIntent[]> {
  const { data, error } = await supabase
    .from('intents')
    .select('id, statement, status, version, expires_at, share_slug')
    .eq('broadcaster_id', broadcasterId)
    .order('created_at', { ascending: false });

  if (error !== null) throw error;

  return data.map((row) => ({
    id: row.id,
    statement: row.statement,
    status: row.status,
    version: row.version,
    expiresAt: new Date(row.expires_at),
    shareSlug: row.share_slug,
  }));
}

export type LifecycleResult = { status: IntentStatus; version: number };

export async function withdrawIntent(
  intentId: string,
  expectedVersion: number,
): Promise<LifecycleResult> {
  const { data, error } = await supabase.rpc('withdraw_intent', {
    target_intent: intentId,
    expected_version: expectedVersion,
  });

  if (error !== null) throw error;

  const [row] = data;
  if (row === undefined) throw new Error('withdraw_intent returned no result');

  return { status: row.intent_status, version: row.intent_version };
}

export async function resolveIntent(
  intentId: string,
  expectedVersion: number,
): Promise<LifecycleResult> {
  const { data, error } = await supabase.rpc('resolve_intent', {
    target_intent: intentId,
    expected_version: expectedVersion,
  });

  if (error !== null) throw error;

  const [row] = data;
  if (row === undefined) throw new Error('resolve_intent returned no result');

  return { status: row.intent_status, version: row.intent_version };
}
