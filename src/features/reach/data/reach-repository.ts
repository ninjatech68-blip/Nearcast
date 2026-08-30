import type { IntentReachLevel } from '@/features/intents/domain/intent';
import { supabase } from '@/infrastructure/supabase/client';

/**
 * Changing an intent's reach. The server rechecks ownership, the held level and
 * the disclosure confirmation, so nothing is pre-authorised here.
 */
export async function changeIntentReach(input: {
  intentId: string;
  expectedLevel: IntentReachLevel;
  targetLevel: IntentReachLevel;
  disclosureConfirmed: boolean;
}): Promise<{ level: IntentReachLevel; version: number }> {
  const { data, error } = await supabase.rpc('change_intent_reach', {
    target_intent: input.intentId,
    expected_level: input.expectedLevel,
    target_level: input.targetLevel,
    disclosure_confirmed: input.disclosureConfirmed,
  });

  if (error !== null) throw error;

  const [row] = data;
  if (row === undefined) throw new Error('change_intent_reach returned no result');

  return { level: row.level, version: row.intent_version };
}
