import {
  toQualificationPayload,
  type ResponseDraft,
} from '@/features/responses/domain/response-draft';
import { supabase } from '@/infrastructure/supabase/client';

/**
 * Submitting a response.
 *
 * The server rechecks delivery, eligibility, expiry, blocks and self-response,
 * so nothing is pre-authorised here. A retry carries the same key and resolves
 * to the original response rather than a refusal.
 */

export type SubmittedResponse = {
  responseId: string;
  status: string;
};

export async function submitResponse(input: {
  intentId: string;
  draft: ResponseDraft;
  requestKey: string;
}): Promise<SubmittedResponse> {
  const { data, error } = await supabase.rpc('submit_response', {
    target_intent: input.intentId,
    response_message: input.draft.message,
    response_qualification: toQualificationPayload(input.draft),
    request_key: input.requestKey,
  });

  if (error !== null) throw error;

  const [row] = data;
  if (row === undefined) throw new Error('submit_response returned no response');

  return { responseId: row.response_id, status: row.response_status };
}
