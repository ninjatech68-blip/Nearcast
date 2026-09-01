-- Column-scoped write grants.
--
-- Every UPDATE policy in this schema answers one question: "is this my row?"
-- None of them answers the second one: "is this my column?" Where a row mixes
-- fields the user owns with the keys that decide what the row *means*, the row
-- check alone is not enough. The owner of the row can rewrite the key and move
-- the row somewhere it was never allowed to be.
--
-- Four cases exist today. Each was reproduced against this exact policy and
-- grant text before this migration was written; the paired test file replays
-- all four and asserts they are now refused.
--
--   intent_deliveries  a recipient repoints intent_id at any live cast and
--                      gains read + join rights on it, because
--                      private.can_read_intent() treats a delivery row as
--                      proof of eligibility.
--   profiles           a restricted account clears its own is_restricted and
--                      walks out of a moderation decision.
--   responses          a respondent repoints intent_id and gains the same read
--                      escalation through the responses branch of
--                      can_read_intent(), and can rewrite message after the
--                      caster has read it.
--   presence_reports   a reporter repoints subject_id and moves a no_show
--                      verdict onto somebody who was never in the plan. The
--                      INSERT policy checks that both parties were present;
--                      the UPDATE policy drops both checks, so the insert-time
--                      guard is bypassable by writing the row twice. The table
--                      is deliberately unreadable by its subject, so the person
--                      carrying the verdict cannot discover it.
--
-- The fix is the grant, not the policy. The policies are correct about rows and
-- stay as they are; they now sit behind a privilege that only covers the
-- columns a client has any business writing. Everything else on these tables is
-- written by SECURITY DEFINER functions -- hide_cast(), respond_to_cast(),
-- withdraw_response(), report_presence(), mark_conversation_read() and the
-- rest -- which run as the function owner and are unaffected by these grants.
--
-- Verified against the app before writing: src/ performs no .update() calls at
-- all, and exactly one direct table write (a profiles upsert in
-- src/features/me/profile-sync.ts, covered by the profiles grant below).
-- Every other write goes through one of the 39 RPCs.

-- intent_deliveries: the recipient may hide a cast and mark it not relevant.
-- The delivery itself -- which cast, to whom, and why -- is the server's.
revoke update on public.intent_deliveries from authenticated;
grant update (hidden_at, feedback) on public.intent_deliveries to authenticated;

-- profiles: a person may edit how they present themselves. is_restricted is a
-- moderation decision about them and is never theirs to write.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_path, city, active_windows)
  on public.profiles to authenticated;

-- responses: a respondent may edit their own message and withdraw. Which cast
-- the response belongs to, and who sent it, are fixed at insert.
revoke update on public.responses from authenticated;
grant update (message, qualification, status) on public.responses to authenticated;

-- presence_reports: a reporter may change their mind about what happened.
-- They may not change who it happened to.
revoke update on public.presence_reports from authenticated;
grant update (report) on public.presence_reports to authenticated;

-- message_receipts: a recipient marks their own copy delivered and read.
-- Which message, and whose receipt, are set when the row is created.
revoke update on public.message_receipts from authenticated;
grant update (delivered_at, read_at) on public.message_receipts to authenticated;
