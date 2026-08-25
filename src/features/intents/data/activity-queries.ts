import { track } from '@/infrastructure/analytics/analytics';
import { supabase } from '@/infrastructure/supabase/client';
import type { Database } from '@/infrastructure/supabase/database.types';

import {
  describeReliability,
  type ReliabilityEntry,
} from '@/features/intents/domain/reliability';

import { PRIMITIVE_LABELS, type QueryResult } from './intent-queries';

export { describeReliability, type ReliabilityEntry };

type IntentStatus = Database['public']['Enums']['intent_status'];

export const STATUS_LABELS: Record<IntentStatus, { label: string; supporting: string }> = {
  draft: { label: 'Draft', supporting: 'Only you can see this intent.' },
  live: { label: 'Live', supporting: 'Visible within your selected reach.' },
  matched: { label: 'Matched', supporting: 'Temporary coordination is available.' },
  resolved: { label: 'Resolved', supporting: 'This intent is closed to new responses.' },
  expired: { label: 'Expired', supporting: 'The response window ended.' },
  withdrawn: { label: 'Withdrawn', supporting: 'You closed this intent.' },
  restricted: { label: 'Under review', supporting: 'Some actions are temporarily unavailable.' },
};

export type OwnedIntent = {
  id: string;
  primitiveLabel: string;
  statement: string;
  status: IntentStatus;
  statusLabel: string;
  statusSupporting: string;
  responseCount: number;
  matchId: string | null;
  expiresAt: string;
};

export type ActivitySnapshot = {
  owned: OwnedIntent[];
  respondedCount: number;
  matchCount: number;
};

const READ_ERROR = 'We could not load your activity. Check your connection and try again.';

export async function fetchActivity(viewerId: string): Promise<QueryResult<ActivitySnapshot>> {
  const [ownedResult, respondedResult, matchResult] = await Promise.all([
    supabase
      .from('intents')
      .select('id, primitive, statement, status, expires_at, responses ( id ), matches ( id )')
      .eq('broadcaster_id', viewerId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('responses').select('id').eq('respondent_id', viewerId),
    supabase.from('matches').select('id, intent_id'),
  ]);

  if (ownedResult.error || respondedResult.error || matchResult.error) {
    return { state: 'error', message: READ_ERROR };
  }

  return {
    state: 'ok',
    data: {
      owned: (ownedResult.data ?? []).map((row) => ({
        id: row.id,
        primitiveLabel: PRIMITIVE_LABELS[row.primitive],
        statement: row.statement,
        status: row.status,
        statusLabel: STATUS_LABELS[row.status].label,
        statusSupporting: STATUS_LABELS[row.status].supporting,
        responseCount: row.responses?.length ?? 0,
        matchId: row.matches?.id ?? null,
        expiresAt: row.expires_at,
      })),
      respondedCount: respondedResult.data?.length ?? 0,
      matchCount: matchResult.data?.length ?? 0,
    },
  };
}

export type ProfileSummary = {
  displayName: string;
  city: string | null;
  isRestricted: boolean;
  verifiedKinds: string[];
  reliability: ReliabilityEntry[];
};

/**
 * Trust is presented as counted evidence. There is no composite score, and the
 * caller cannot derive one because only raw counts are returned.
 */
export async function fetchProfileSummary(
  profileId: string,
): Promise<QueryResult<ProfileSummary | null>> {
  const [profileResult, verificationResult, reliabilityResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, city, is_restricted')
      .eq('id', profileId)
      .maybeSingle(),
    supabase.from('verifications').select('kind, state').eq('profile_id', profileId),
    supabase
      .from('reliability_aggregates')
      .select('context, completed_count, confirmed_count')
      .eq('profile_id', profileId),
  ]);

  if (profileResult.error) return { state: 'error', message: READ_ERROR };
  if (!profileResult.data) return { state: 'ok', data: null };

  return {
    state: 'ok',
    data: {
      displayName: profileResult.data.display_name,
      city: profileResult.data.city,
      isRestricted: profileResult.data.is_restricted,
      verifiedKinds: (verificationResult.data ?? [])
        .filter((row) => row.state === 'verified')
        .map((row) => row.kind),
      reliability: (reliabilityResult.data ?? []).map((row) => ({
        context: PRIMITIVE_LABELS[row.context],
        completed: Number(row.completed_count),
        confirmed: Number(row.confirmed_count),
      })),
    },
  };
}

export type SubmitResponseResult = { ok: true } | { ok: false; message: string };

export async function submitResponse(
  intentId: string,
  message: string,
  qualification: Record<string, string>,
  idempotencyKey: string,
): Promise<SubmitResponseResult> {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: 'Write a short message so the broadcaster can decide.' };
  }
  if (Object.keys(qualification).length > 2) {
    return { ok: false, message: 'Answer at most two qualifying questions.' };
  }

  const { data, error } = await supabase.rpc('submit_response', {
    target_intent_id: intentId,
    response_message: trimmed,
    qualification_answers: qualification,
    idempotency_key: idempotencyKey,
  });

  if (!error && data) {
    track('response_submitted', {
      intent_id: intentId,
      response_id: data.id,
      action_type: 'respond',
      qualification_count: Object.keys(qualification).length,
    });
  }

  if (error) {
    return {
      ok: false,
      message: 'Your response was not sent. Check your connection and try again.',
    };
  }
  return { ok: true };
}
