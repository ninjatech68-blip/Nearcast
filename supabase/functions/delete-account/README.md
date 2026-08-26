# delete-account

The server half of account deletion (MUST-004). The database half does the
data work and is covered by `supabase/tests/database/nearcast_phase4.test.sql`;
this function adds the part a database function cannot do — ending the session
and stopping the account from signing back in.

## Order matters

1. Verify the caller's JWT and resolve their user id.
2. Call `public.delete_account(confirmation)` **with the caller's own token**,
   so the function derives the actor from `auth.uid()`. The service role is
   never used to choose whose account is deleted.
3. Only then, with the service role: revoke sessions globally and ban the
   account.

## Never delete the `auth.users` row

`public.profiles.id` references `auth.users(id)` `on delete cascade`. Deleting
the row would destroy the anonymized profile, the redactions and the
suppression record — the very evidence the deletion tests guarantee. Ban,
never delete.

## Verification status

Written 2026-08-26. **Not yet executed against a running stack**: the sandbox
that authored it cannot run Docker. It is a blocker-runbook item — run
`supabase functions serve delete-account` against the local stack, delete a
throwaway persona, and confirm the session is dead and sign-in refused while
the anonymized profile and suppression row survive.
