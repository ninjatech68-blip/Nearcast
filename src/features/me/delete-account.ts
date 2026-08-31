import { getSupabase } from '@/infrastructure/supabase/client';

/**
 * Deleting the account, on the server.
 *
 * The screen used to wipe the device and return to sign-in, while its own
 * comment described a server that tombstoned the profile. No such call
 * existed, so the account, the casts, the responses and the messages all
 * stayed exactly where they were and the screen told the person otherwise.
 *
 * Returns false when there is no backend, so the caller can say what
 * actually happened rather than claiming a deletion that could not have
 * taken place.
 */
export async function deleteMyAccount(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client.rpc('delete_my_account');

  if (error) throw new Error(error.message);

  return true;
}
