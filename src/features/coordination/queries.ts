import { track } from '@/infrastructure/analytics/analytics';
import { supabase } from '@/infrastructure/supabase/client';
import type { Database } from '@/infrastructure/supabase/database.types';

import type { QueryResult } from '@/features/intents/data/intent-queries';

type ResponseStatus = Database['public']['Enums']['response_status'];

const READ_ERROR = 'We could not load this right now. Check your connection and try again.';

/**
 * One respondent's entry in the broadcaster inbox. Contextual trust evidence
 * only — counts traceable to stored records, never a score (C-03).
 */
export type InboxEntry = {
  responseId: string;
  respondentId: string;
  respondentName: string;
  message: string;
  qualification: Record<string, string>;
  status: ResponseStatus;
  reliabilityLine: string | null;
  createdAt: string;
};

export async function fetchInbox(intentId: string): Promise<QueryResult<InboxEntry[]>> {
  const responses = await supabase
    .from('responses')
    .select('id, respondent_id, message, qualification, status, created_at')
    .eq('intent_id', intentId)
    .order('created_at', { ascending: true });

  if (responses.error) return { state: 'error', message: READ_ERROR };

  const respondentIds = [...new Set((responses.data ?? []).map((row) => row.respondent_id))];
  if (respondentIds.length === 0) return { state: 'ok', data: [] };

  const [profiles, reliability] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', respondentIds),
    supabase
      .from('reliability_aggregates')
      .select('profile_id, completed_count, confirmed_count')
      .in('profile_id', respondentIds),
  ]);

  if (profiles.error || reliability.error) return { state: 'error', message: READ_ERROR };

  const nameById = new Map((profiles.data ?? []).map((row) => [row.id, row.display_name]));
  const reliabilityById = new Map(
    (reliability.data ?? []).map((row) => [
      row.profile_id,
      Number(row.confirmed_count) === 0
        ? null
        : `${row.completed_count} of ${row.confirmed_count} confirmed interactions were completed`,
    ]),
  );

  return {
    state: 'ok',
    data: (responses.data ?? []).map((row) => ({
      responseId: row.id,
      respondentId: row.respondent_id,
      respondentName: nameById.get(row.respondent_id) ?? 'A member',
      message: row.message,
      qualification: (row.qualification ?? {}) as Record<string, string>,
      status: row.status,
      reliabilityLine: reliabilityById.get(row.respondent_id) ?? null,
      createdAt: row.created_at,
    })),
  };
}

export type DecisionResult = { ok: true } | { ok: false; message: string };

export async function decideResponse(
  responseId: string,
  decision: 'accept' | 'decline',
): Promise<DecisionResult> {
  const { data, error } = await supabase.rpc('decide_response', {
    target_response_id: responseId,
    decision,
    expected_intent_status: 'live',
  });

  if (!error && data) {
    track('response_decided', {
      intent_id: data.intent_id,
      response_id: responseId,
      decision,
    });
  }

  if (error) {
    return {
      ok: false,
      message:
        decision === 'accept'
          ? 'This response could not be accepted. The intent may have changed — refresh and try again.'
          : 'This response could not be declined right now. Try again.',
    };
  }
  return { ok: true };
}

export type RoomMessage = {
  id: string;
  body: string;
  isMine: boolean;
  isSystem: boolean;
  createdAt: string;
};

export type ReleasedField = { fieldName: string; fieldValue: string };

export type Room = {
  matchId: string;
  conversationId: string;
  closed: boolean;
  isBroadcaster: boolean;
  counterpartId: string;
  counterpartName: string;
  intentId: string;
  intentStatement: string;
  intentStatus: Database['public']['Enums']['intent_status'];
  messages: RoomMessage[];
  released: ReleasedField[];
};

export async function fetchRoom(matchId: string, viewerId: string): Promise<QueryResult<Room | null>> {
  const match = await supabase
    .from('matches')
    .select('id, intent_id, broadcaster_id, participant_id')
    .eq('id', matchId)
    .maybeSingle();

  if (match.error) return { state: 'error', message: READ_ERROR };
  if (!match.data) return { state: 'ok', data: null };

  const isBroadcaster = match.data.broadcaster_id === viewerId;
  const counterpartId = isBroadcaster ? match.data.participant_id : match.data.broadcaster_id;

  const [conversation, intent, counterpart, disclosures] = await Promise.all([
    supabase
      .from('conversations')
      .select('id, closed_at')
      .eq('match_id', match.data.id)
      .maybeSingle(),
    supabase
      .from('intents')
      .select('id, statement, status')
      .eq('id', match.data.intent_id)
      .maybeSingle(),
    supabase.from('profiles').select('display_name').eq('id', counterpartId).maybeSingle(),
    supabase.rpc('get_match_disclosures', { target_match_id: match.data.id }),
  ]);

  if (conversation.error || intent.error || counterpart.error || disclosures.error) {
    return { state: 'error', message: READ_ERROR };
  }
  if (!conversation.data || !intent.data) return { state: 'ok', data: null };

  const messages = await supabase
    .from('messages')
    .select('id, body, sender_id, is_system, created_at')
    .eq('conversation_id', conversation.data.id)
    .order('created_at', { ascending: true });

  if (messages.error) return { state: 'error', message: READ_ERROR };

  return {
    state: 'ok',
    data: {
      matchId: match.data.id,
      conversationId: conversation.data.id,
      closed: conversation.data.closed_at !== null,
      isBroadcaster,
      counterpartId,
      counterpartName: counterpart.data?.display_name ?? 'A member',
      intentId: intent.data.id,
      intentStatement: intent.data.statement,
      intentStatus: intent.data.status,
      messages: (messages.data ?? []).map((row) => ({
        id: row.id,
        body: row.body,
        isMine: row.sender_id === viewerId,
        isSystem: row.is_system,
        createdAt: row.created_at,
      })),
      released: (disclosures.data ?? []).map((row) => ({
        fieldName: row.field_name,
        fieldValue: row.field_value,
      })),
    },
  };
}

export async function sendRoomMessage(
  conversationId: string,
  body: string,
  idempotencyKey: string,
  matchId?: string,
): Promise<DecisionResult> {
  const trimmed = body.trim();
  if (trimmed.length === 0) return { ok: false, message: 'Write a message first.' };

  const { error } = await supabase.rpc('send_message', {
    target_conversation_id: conversationId,
    body: trimmed,
    idempotency_key: idempotencyKey,
  });
  if (error) {
    return { ok: false, message: 'Your message was not sent. Check your connection and try again.' };
  }
  if (matchId) {
    track('coordination_message_sent', { match_id: matchId, message_type: 'text' });
  }
  return { ok: true };
}

/** Human-readable labels for the four releasable private fields. */
export const RELEASABLE_FIELDS: { fieldName: string; label: string }[] = [
  { fieldName: 'exact_address', label: 'Share exact address' },
  { fieldName: 'private_contact', label: 'Share contact details' },
  { fieldName: 'coordination_notes', label: 'Share coordination notes' },
];

export async function releaseField(matchId: string, fieldName: string): Promise<DecisionResult> {
  const { error } = await supabase.rpc('release_disclosure', {
    target_match_id: matchId,
    field_names: [fieldName],
  });
  return error
    ? { ok: false, message: 'This could not be shared right now. Try again.' }
    : { ok: true };
}

/** Blocking is immediate and global between the two accounts. */
export async function blockUser(blockerId: string, blockedId: string): Promise<DecisionResult> {
  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  return error
    ? { ok: false, message: 'The block did not apply. Try again.' }
    : { ok: true };
}

export async function reportUser(profileId: string): Promise<DecisionResult> {
  const { error } = await supabase.rpc('create_report', {
    subject_type: 'profile',
    subject_id: profileId,
    reason_code: 'other_safety_concern',
    details: '',
  });
  return error
    ? { ok: false, message: 'The report was not sent. Try again.' }
    : { ok: true };
}

/** Feed feedback: hiding stops delivery of this intent to this recipient. */
export async function hideDelivery(
  intentId: string,
  recipientId: string,
  notRelevant: boolean,
): Promise<DecisionResult> {
  const { error } = await supabase
    .from('intent_deliveries')
    .update({
      hidden_at: new Date().toISOString(),
      feedback: notRelevant ? 'not_relevant' : null,
    })
    .eq('intent_id', intentId)
    .eq('recipient_id', recipientId);
  if (error) {
    return { ok: false, message: 'This could not be hidden right now. Try again.' };
  }
  if (notRelevant) {
    track('intent_feedback_submitted', { intent_id: intentId, feedback_type: 'not_relevant' });
  }
  return { ok: true };
}

export const RESOLUTION_OUTCOMES: {
  outcome: Database['public']['Enums']['resolution_outcome'];
  label: string;
  affectsReliability: boolean;
}[] = [
  { outcome: 'resolved_through_nearcast', label: 'Resolved through Nearcast', affectsReliability: true },
  { outcome: 'resolved_elsewhere', label: 'Resolved elsewhere', affectsReliability: false },
  { outcome: 'no_longer_needed', label: 'No longer needed', affectsReliability: false },
  { outcome: 'could_not_resolve', label: 'Could not resolve before expiry', affectsReliability: false },
];

/**
 * Closes an intent with a factual outcome. Only "resolved through Nearcast"
 * with the other participant's confirmation ever affects reliability.
 */
export async function resolveIntent(
  intentId: string,
  expectedStatus: Database['public']['Enums']['intent_status'],
  outcome: Database['public']['Enums']['resolution_outcome'],
): Promise<DecisionResult> {
  const { error } = await supabase.rpc('close_intent', {
    target_intent_id: intentId,
    expected_status: expectedStatus,
    outcome,
  });
  if (error) {
    return {
      ok: false,
      message: 'The intent could not be closed. It may have changed — refresh and try again.',
    };
  }
  track('intent_resolution_submitted', { intent_id: intentId, resolution_type: outcome });
  return { ok: true };
}

/** Records whether the interaction actually happened. Factual, never a rating. */
export async function confirmOutcome(
  matchId: string,
  intentId: string,
  completed: boolean,
  disputed: boolean,
): Promise<DecisionResult> {
  const { error } = await supabase.rpc('confirm_interaction_outcome', {
    target_match_id: matchId,
    completed,
    disputed,
  });
  if (error) {
    return { ok: false, message: 'This could not be recorded right now. Try again.' };
  }
  track('interaction_completion_confirmed', {
    intent_id: intentId,
    match_id: matchId,
    confirmed: completed,
  });
  return { ok: true };
}

/**
 * Deletes the caller's account data (MUST-004). The server anonymizes the
 * profile, withdraws open intents, clears private fields, redacts sent
 * content, and records a suppression row — while preserving safety evidence
 * and the other party's history. The caller must sign out afterwards; session
 * revocation itself is the Edge half of this contract.
 */
export async function deleteAccount(): Promise<DecisionResult> {
  // Through the Edge Function, not the RPC directly: the database half cannot
  // end the session, and deletion that leaves someone signed in has not
  // finished. The function calls `delete_account` with this caller's own
  // token, so the actor is still derived from `auth.uid()`.
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: { confirmation: 'DELETE' },
  });

  if (error) {
    return { ok: false, message: 'Your account could not be deleted right now. Try again.' };
  }

  // The data is gone but the session survived. Say so rather than reporting a
  // clean success the person could disprove by staying signed in.
  if ((data as { error?: string } | null)?.error === 'partially_completed') {
    return {
      ok: false,
      message:
        'Your data was deleted, but we could not end the session on this device. Sign out, and contact support if you can still sign in.',
    };
  }

  return { ok: true };
}
