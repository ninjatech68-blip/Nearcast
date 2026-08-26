// delete-account — the server half of MUST-004.
//
// The database half (`public.delete_account`) anonymizes the profile,
// withdraws open intents, clears private fields, redacts sent content and
// records a suppression row. It cannot do the last thing deletion promises:
// end the session and stop the account signing back in. That needs the Auth
// admin API, so it lives here.
//
// CRITICAL: never delete the `auth.users` row. `public.profiles.id` references
// it `on delete cascade`, so removing it would destroy the anonymized profile,
// the redactions and the suppression trail the tests guarantee. The account is
// banned, which stops sign-in while leaving the record intact.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/** A century. Supabase has no permanent flag, so the ban is simply long. */
const BAN_DURATION = '876000h';

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const authorization = request.headers.get('Authorization') ?? '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return json({ error: 'not_authenticated' }, 401);
  }

  let confirmation = '';
  try {
    const body = await request.json();
    confirmation = typeof body?.confirmation === 'string' ? body.confirmation : '';
  } catch {
    return json({ error: 'invalid_input' }, 400);
  }

  // The caller's own token, so `delete_account` derives the actor from
  // `auth.uid()` and can only ever delete the person who called it. The
  // service role is never used to choose whose account goes.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: 'not_authenticated' }, 401);
  }
  const userId = userData.user.id;

  const { error: deleteError } = await caller.rpc('delete_account', { confirmation });
  if (deleteError) {
    // The function raises the stable codes from Doc 16; an unrecognised code
    // is reported as a refusal rather than guessed at.
    const code = deleteError.message?.includes('invalid_input')
      ? 'invalid_input'
      : deleteError.message?.includes('not_authorized')
        ? 'not_authorized'
        : 'conflict';
    return json({ error: code }, code === 'invalid_input' ? 400 : 409);
  }

  // Data is gone. From here the account exists only to stay revoked, and a
  // failure must be reported honestly rather than swallowed: the person is
  // entitled to know their session was not ended.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { error: signOutError } = await admin.auth.admin.signOut(
    authorization.slice('bearer '.length),
    'global',
  );

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: BAN_DURATION,
  });

  if (signOutError || banError) {
    return json(
      {
        error: 'partially_completed',
        detail: 'Your data was deleted, but the session could not be ended. Sign out and contact support.',
      },
      500,
    );
  }

  return json({ ok: true }, 200);
});
