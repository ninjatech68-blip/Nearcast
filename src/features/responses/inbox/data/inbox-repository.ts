import type { ResponseStatus } from '@/features/responses/inbox/domain/status';
import { supabase } from '@/infrastructure/supabase/client';

/**
 * The broadcaster's view of responses to their own intents.
 *
 * RLS limits this to responses on intents the viewer broadcasts, so no
 * ownership filter is applied here; the query cannot reach anyone else's inbox.
 */

export type InboxResponse = {
  id: string;
  intentId: string;
  intentStatement: string;
  intentStatus: string;
  respondentFirstName: string;
  message: string;
  qualification: Record<string, unknown>;
  status: ResponseStatus;
};

function firstNameOf(displayName: string): string {
  return displayName.split(' ')[0] ?? displayName;
}

export async function fetchInbox(): Promise<InboxResponse[]> {
  const { data, error } = await supabase
    .from('responses')
    .select(
      'id, intent_id, message, qualification, status, profiles!responses_respondent_id_fkey(display_name), intents!inner(statement, status, broadcaster_id)',
    )
    .order('created_at', { ascending: false });

  if (error !== null) throw error;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const viewerId = session?.user.id;

  return data
    // A respondent's own response also satisfies the read policy; the inbox is
    // the broadcaster's view, so those are filtered out here.
    .filter((row) => row.intents.broadcaster_id === viewerId)
    .map((row) => ({
      id: row.id,
      intentId: row.intent_id,
      intentStatement: row.intents.statement,
      intentStatus: row.intents.status,
      respondentFirstName: firstNameOf(row.profiles?.display_name ?? 'Someone'),
      message: row.message,
      qualification: (row.qualification ?? {}) as Record<string, unknown>,
      status: row.status,
    }));
}

export async function acceptResponse(
  responseId: string,
  expectedIntentStatus: string,
): Promise<{ matchId: string }> {
  const { data, error } = await supabase.rpc('accept_response', {
    response_to_accept: responseId,
    expected_intent_status: expectedIntentStatus as never,
  });

  if (error !== null) throw error;
  if (data === null) throw new Error('accept_response returned no match');

  return { matchId: data.id };
}

export async function declineResponse(
  responseId: string,
  expectedStatus: ResponseStatus,
): Promise<{ status: ResponseStatus }> {
  const { data, error } = await supabase.rpc('decline_response', {
    target_response: responseId,
    expected_status: expectedStatus,
  });

  if (error !== null) throw error;

  const [row] = data;
  if (row === undefined) throw new Error('decline_response returned no result');

  return { status: row.response_status };
}
